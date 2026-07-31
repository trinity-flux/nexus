import type { SupabaseClient } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

import type {
  Category,
  CategoryId,
  Page,
  Post,
  PostId,
  Topic,
  TopicId,
  TopicQuery,
} from '../domain/entities';
import { findMatchRanges, parseSearchTerms } from '../domain/highlight';
import type { PostEvent, ReplyDraft, SearchResult, TopicDraft, TopicEvent } from '../domain/ports';
import {
  type CategoryDto,
  type PostDto,
  type TopicDto,
  toCategory,
  toPost,
  toTopic,
} from './mappers';

const DEFAULT_PAGE_SIZE = 20;

/** The joined author, selected identically everywhere so the mapper is one shape. */
const AUTHOR_COLUMNS = 'author:profiles!author_id(id, username, display_name, avatar_url, role)';

const TOPIC_COLUMNS = `id, category_id, slug, title, is_pinned, is_locked, reply_count, last_activity_at, created_at, ${AUTHOR_COLUMNS}`;

const POST_COLUMNS = `id, topic_id, parent_id, body_md, path, depth, is_opening_post, edited_at, created_at, deleted_at, ${AUTHOR_COLUMNS}`;

/**
 * Turns a PostgREST failure into an error the application can show.
 *
 * Supabase reports a policy rejection as an ordinary error, so without this a
 * member who is not allowed to post sees "new row violates row-level security
 * policy for table posts", which tells them nothing they can act on.
 */
function fail(context: string, error: { message: string; code?: string } | null): never {
  if (error?.code === '42501' || error?.message.includes('row-level security')) {
    throw new Error('You are not allowed to do that.');
  }
  throw new Error(`${context}: ${error?.message ?? 'unknown error'}`);
}

/**
 * The forum, against Supabase.
 *
 * Exposed as the same four ports as the in-memory adapter and built by the same
 * kind of factory, so the container chooses between them and nothing else in
 * the application can tell which is running.
 *
 * Note what is absent: nowhere does this send an author id. Postgres fills
 * `author_id` from `auth.uid()`, which is the only version of that fact a
 * client cannot lie about.
 */
export interface SupabaseForum {
  categories: {
    list(): Promise<Category[]>;
    findBySlug(slug: string): Promise<Category | null>;
  };
  topics: {
    list(query: TopicQuery): Promise<Page<Topic>>;
    findBySlug(categorySlug: string, topicSlug: string): Promise<Topic | null>;
    create(draft: TopicDraft): Promise<Topic>;
    updateTitle(id: TopicId, title: string): Promise<Topic>;
    remove(id: TopicId): Promise<void>;
    watchCategory(categoryId: CategoryId): Observable<TopicEvent>;
  };
  posts: {
    listByTopic(topicId: TopicId): Promise<Post[]>;
    reply(draft: ReplyDraft): Promise<Post>;
    edit(id: PostId, bodyMarkdown: string): Promise<Post>;
    remove(id: PostId): Promise<void>;
    watchTopic(topicId: TopicId): Observable<PostEvent>;
  };
  search: {
    search(query: string, limit?: number): Promise<SearchResult[]>;
  };
}

export function createSupabaseForum(client: SupabaseClient): SupabaseForum {
  /** Re-reads a row with its author joined, which an insert or update does not return. */
  async function readTopic(id: string): Promise<Topic> {
    const { data, error } = await client
      .from('topics')
      .select(TOPIC_COLUMNS)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      fail('Could not read the topic back', error);
    }
    return toTopic(data as unknown as TopicDto);
  }

  async function readPost(id: string): Promise<Post> {
    const { data, error } = await client.from('posts').select(POST_COLUMNS).eq('id', id).single();

    if (error || !data) {
      fail('Could not read the post back', error);
    }
    return toPost(data as unknown as PostDto);
  }

  return {
    categories: {
      async list(): Promise<Category[]> {
        // The count comes from the join rather than a second round trip, and
        // it counts only what the caller may see: a topic hidden by policy
        // must not appear in the total.
        const { data, error } = await client
          .from('categories')
          .select('id, slug, name, description, is_locked, allow_anonymous, topics(count)')
          .order('sort_order', { ascending: true });

        if (error || !data) {
          fail('Could not load the categories', error);
        }

        return data.map((row) => {
          const { topics, ...category } = row as unknown as CategoryDto & {
            topics: { count: number }[];
          };
          return toCategory(category, topics[0]?.count ?? 0);
        });
      },

      async findBySlug(slug: string): Promise<Category | null> {
        const { data, error } = await client
          .from('categories')
          .select('id, slug, name, description, is_locked, allow_anonymous, topics(count)')
          .eq('slug', slug)
          .maybeSingle();

        if (error) {
          fail('Could not load the category', error);
        }
        if (!data) {
          return null;
        }

        const { topics, ...category } = data as unknown as CategoryDto & {
          topics: { count: number }[];
        };
        return toCategory(category, topics[0]?.count ?? 0);
      },
    },

    topics: {
      async list(query: TopicQuery): Promise<Page<Topic>> {
        const limit = query.limit ?? DEFAULT_PAGE_SIZE;
        const offset = query.cursor ? Number.parseInt(query.cursor, 10) : 0;

        let request = client
          .from('topics')
          .select(TOPIC_COLUMNS)
          .eq('category_id', query.categoryId)
          .is('deleted_at', null)
          // Pinned first regardless of sort: that is what pinning means.
          .order('is_pinned', { ascending: false });

        request =
          query.sort === 'new'
            ? request.order('created_at', { ascending: false })
            : query.sort === 'top'
              ? request.order('reply_count', { ascending: false })
              : request.order('last_activity_at', { ascending: false });

        // One row beyond the page, used only to decide whether there is a next
        // one. Cheaper and more honest than a count query, which would have to
        // scan every topic in the category to answer a yes/no question.
        const { data, error } = await request.range(offset, offset + limit);

        if (error || !data) {
          fail('Could not load the topics', error);
        }

        const rows = data as unknown as TopicDto[];
        const hasMore = rows.length > limit;

        return {
          items: rows.slice(0, limit).map(toTopic),
          nextCursor: hasMore ? String(offset + limit) : null,
        };
      },

      async findBySlug(categorySlug: string, topicSlug: string): Promise<Topic | null> {
        const { data, error } = await client
          .from('topics')
          .select(`${TOPIC_COLUMNS}, categories!inner(slug)`)
          .eq('categories.slug', categorySlug)
          .eq('slug', topicSlug)
          .is('deleted_at', null)
          .maybeSingle();

        if (error) {
          fail('Could not load the topic', error);
        }
        return data ? toTopic(data as unknown as TopicDto) : null;
      },

      async create(draft: TopicDraft): Promise<Topic> {
        // The RPC, not two inserts. It derives a unique slug and writes the
        // opening post in the same transaction, so a failure halfway cannot
        // leave a topic with nothing in it.
        const { data, error } = await client.rpc('create_topic', {
          p_category_id: draft.categoryId,
          p_title: draft.title,
          p_body_md: draft.bodyMarkdown,
        });

        if (error || !data) {
          fail('Could not create the topic', error);
        }
        return readTopic((data as { id: string }).id);
      },

      async updateTitle(id: TopicId, title: string): Promise<Topic> {
        const { error } = await client.from('topics').update({ title }).eq('id', id);

        if (error) {
          fail('Could not rename the topic', error);
        }
        return readTopic(id);
      },

      async remove(id: TopicId): Promise<void> {
        // Soft, always. Hard-deleting a topic takes its replies with it, and
        // the forum convention is to keep the thread and mark the gap.
        const { error } = await client
          .from('topics')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          fail('Could not remove the topic', error);
        }
      },

      watchCategory(categoryId: CategoryId): Observable<TopicEvent> {
        return new Observable<TopicEvent>((subscriber) => {
          const channel = client
            .channel(`topics:${categoryId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'topics',
                filter: `category_id=eq.${categoryId}`,
              },
              (payload) => {
                const row = payload.new as { id?: string } | null;
                if (!row?.id) {
                  return;
                }
                // Re-read rather than map the payload: realtime sends the raw
                // row, with no joined author, so mapping it directly would
                // show every new topic as written by nobody.
                readTopic(row.id)
                  .then((topic) => {
                    subscriber.next({
                      type: payload.eventType === 'INSERT' ? 'topic-created' : 'topic-updated',
                      topic,
                    });
                  })
                  .catch(() => {
                    // A row the policy will not show us is not an error; it is
                    // a topic this visitor is not entitled to see.
                  });
              },
            )
            .subscribe();

          return () => {
            void client.removeChannel(channel);
          };
        });
      },
    },

    posts: {
      async listByTopic(topicId: TopicId): Promise<Post[]> {
        const { data, error } = await client
          .from('posts')
          .select(POST_COLUMNS)
          .eq('topic_id', topicId)
          // By `path`, so the caller builds the tree in one pass. Ordering by
          // created_at would interleave branches.
          .order('path', { ascending: true });

        if (error || !data) {
          fail('Could not load the thread', error);
        }
        return (data as unknown as PostDto[]).map(toPost);
      },

      async reply(draft: ReplyDraft): Promise<Post> {
        const { data, error } = await client
          .from('posts')
          .insert({
            topic_id: draft.topicId,
            parent_id: draft.parentId,
            body_md: draft.bodyMarkdown,
          })
          .select('id')
          .single();

        if (error || !data) {
          fail('Could not post the reply', error);
        }
        // `path` and `depth` are set by a trigger, so the inserted row as
        // returned is not the row that was stored.
        return readPost((data as { id: string }).id);
      },

      async edit(id: PostId, bodyMarkdown: string): Promise<Post> {
        const { error } = await client
          .from('posts')
          .update({ body_md: bodyMarkdown, edited_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          fail('Could not save the edit', error);
        }
        return readPost(id);
      },

      async remove(id: PostId): Promise<void> {
        const { error } = await client
          .from('posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          fail('Could not remove the post', error);
        }
      },

      watchTopic(topicId: TopicId): Observable<PostEvent> {
        return new Observable<PostEvent>((subscriber) => {
          const channel = client
            .channel(`posts:${topicId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: `topic_id=eq.${topicId}`,
              },
              (payload) => {
                const row = payload.new as { id?: string } | null;
                if (!row?.id) {
                  return;
                }
                readPost(row.id)
                  .then((post) => {
                    subscriber.next({
                      type: payload.eventType === 'INSERT' ? 'post-created' : 'post-updated',
                      post,
                    });
                  })
                  .catch(() => {
                    /* Withheld by policy; not this visitor's to see. */
                  });
              },
            )
            .subscribe();

          return () => {
            void client.removeChannel(channel);
          };
        });
      },
    },

    search: {
      async search(query: string, limit = DEFAULT_PAGE_SIZE): Promise<SearchResult[]> {
        const terms = parseSearchTerms(query);
        if (terms.length === 0) {
          return [];
        }

        // `websearch_to_tsquery` against the generated `search_vector` and its
        // GIN index — not ILIKE, which cannot use an index and matches inside
        // words. It also accepts what people actually type, including quoted
        // phrases and `-excluded`, without any parsing here.
        const { data, error } = await client
          .from('topics')
          .select(`${TOPIC_COLUMNS}, categories!inner(slug)`)
          .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
          .is('deleted_at', null)
          .order('last_activity_at', { ascending: false })
          .limit(limit);

        if (error || !data) {
          fail('Could not search', error);
        }

        return (data as unknown as (TopicDto & { categories: { slug: string } })[]).map((row) => ({
          topic: toTopic(row),
          categorySlug: row.categories.slug,
          excerpt: row.title,
          // Computed here rather than with `ts_headline`, which returns a
          // string with markup already in it. Offsets keep the excerpt plain
          // text, so rendering a title someone else wrote stays incapable of
          // producing an element.
          matches: findMatchRanges(row.title, terms),
        }));
      },
    },
  };
}
