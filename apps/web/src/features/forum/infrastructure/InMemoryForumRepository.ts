import { Observable, Subject } from 'rxjs';

import {
  type Author,
  asPostId,
  asTopicId,
  type Category,
  type CategoryId,
  type Page,
  type Post,
  type PostId,
  type Topic,
  type TopicId,
  type TopicQuery,
} from '../domain/entities';
import { findMatchRanges, parseSearchTerms } from '../domain/highlight';
import type { PostEvent, ReplyDraft, SearchResult, TopicDraft, TopicEvent } from '../domain/ports';
import { SEED_CATEGORIES, SEED_POSTS, SEED_TOPICS } from './seedContent';

const DEFAULT_PAGE_SIZE = 20;

/**
 * The forum, in memory.
 *
 * Not a mock. It is exposed through the same ports as the Supabase adapter —
 * see `createInMemoryForum` — and held to the same contract tests, which is
 * what makes it trustworthy for two jobs:
 * running the whole product with no backend at all, and giving every test a
 * real repository instead of a hand-written stub that agrees with whatever the
 * test expects.
 *
 * Latency is simulated deliberately. Against an instant repository, loading
 * states and optimistic updates never render, so nobody notices they are
 * broken until production.
 *
 * The four ports are adapted onto this one class rather than implemented by it
 * directly: `list`, `findBySlug` and `remove` mean different things on
 * different ports, and one class cannot carry three versions of each name.
 */
export class InMemoryForumRepository {
  private readonly categories: Category[];
  private topics: Topic[];
  private posts: Post[];
  private readonly topicEvents = new Subject<TopicEvent>();
  private readonly postEvents = new Subject<PostEvent>();
  private readonly latencyMs: number;
  private readonly currentAuthor: () => Author | null;
  private sequence = 0;

  // Written out rather than declared as constructor parameter properties:
  // `erasableSyntaxOnly` rejects those, because they are TypeScript syntax
  // with a runtime effect that a type-stripping tool cannot reproduce.
  constructor(
    latencyMs = 220,
    seed: {
      categories?: Category[];
      topics?: Topic[];
      posts?: Post[];
      /**
       * Who is writing. Supplied by the composition root rather than read
       * here, because the forum has no business knowing the auth feature
       * exists — and because in the real adapter this is not the client's to
       * decide at all: Postgres fills author_id from auth.uid().
       */
      currentAuthor?: () => Author | null;
    } = {},
  ) {
    this.latencyMs = latencyMs;
    this.currentAuthor = seed.currentAuthor ?? (() => null);
    this.categories = seed.categories ?? [...SEED_CATEGORIES];
    this.topics = seed.topics ?? [...SEED_TOPICS];
    this.posts = seed.posts ?? [...SEED_POSTS];
  }

  async listCategories(): Promise<Category[]> {
    await this.delay();
    return this.categories.map((category) => ({
      ...category,
      topicCount: this.topics.filter((topic) => topic.categoryId === category.id).length,
    }));
  }

  async findCategoryBySlug(slug: string): Promise<Category | null> {
    await this.delay();
    return this.categories.find((category) => category.slug === slug) ?? null;
  }

  async listTopics(query: TopicQuery): Promise<Page<Topic>> {
    await this.delay();

    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const inCategory = this.topics.filter((topic) => topic.categoryId === query.categoryId);
    const sorted = sortTopics(inCategory, query.sort);

    // A cursor is the index of the first item of the next page. Opaque to the
    // caller by contract, so swapping it for a keyset cursor in the Supabase
    // adapter changes nothing above this layer.
    const start = query.cursor ? Number.parseInt(query.cursor, 10) : 0;
    const items = sorted.slice(start, start + limit);
    const nextIndex = start + limit;

    return {
      items,
      nextCursor: nextIndex < sorted.length ? String(nextIndex) : null,
    };
  }

  async findTopicBySlug(categorySlug: string, topicSlug: string): Promise<Topic | null> {
    await this.delay();
    const category = this.categories.find((entry) => entry.slug === categorySlug);
    if (!category) {
      return null;
    }
    return (
      this.topics.find((topic) => topic.categoryId === category.id && topic.slug === topicSlug) ??
      null
    );
  }

  async createTopic(draft: TopicDraft): Promise<Topic> {
    await this.delay();

    const topic: Topic = {
      id: asTopicId(`t-${this.nextId()}`),
      categoryId: draft.categoryId,
      slug: slugify(draft.title),
      title: draft.title,
      author: this.currentAuthor(),
      isPinned: false,
      isLocked: false,
      replyCount: 0,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.topics = [topic, ...this.topics];

    const opening: Post = {
      id: asPostId(`po-${this.nextId()}`),
      topicId: topic.id,
      parentId: null,
      author: this.currentAuthor(),
      bodyMarkdown: draft.bodyMarkdown,
      path: [],
      depth: 0,
      isOpeningPost: true,
      editedAt: null,
      createdAt: new Date().toISOString(),
      isRemoved: false,
    };
    opening.path = [opening.id];
    this.posts = [...this.posts, opening];

    this.topicEvents.next({ type: 'topic-created', topic });
    return topic;
  }

  async updateTitle(id: TopicId, title: string): Promise<Topic> {
    await this.delay();
    const updated = this.mapTopic(id, (topic) => ({ ...topic, title }));
    this.topicEvents.next({ type: 'topic-updated', topic: updated });
    return updated;
  }

  async removeTopic(id: TopicId): Promise<void> {
    await this.delay();
    this.topics = this.topics.filter((topic) => topic.id !== id);
  }

  watchCategory(categoryId: CategoryId): Observable<TopicEvent> {
    return new Observable<TopicEvent>((subscriber) => {
      const subscription = this.topicEvents.subscribe((event) => {
        if (event.topic.categoryId === categoryId) {
          subscriber.next(event);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  async listByTopic(topicId: TopicId): Promise<Post[]> {
    await this.delay();
    return this.posts
      .filter((post) => post.topicId === topicId)
      .sort((a, b) => a.path.join('/').localeCompare(b.path.join('/')));
  }

  async createReply(draft: ReplyDraft): Promise<Post> {
    await this.delay();

    const parent = draft.parentId
      ? this.posts.find((post) => post.id === draft.parentId)
      : undefined;

    const id = asPostId(`po-${this.nextId()}`);
    // Mirrors the database trigger, including the depth cap: a reply past the
    // limit is re-parented rather than refused, because losing what someone
    // wrote is worse than flattening it.
    const parentPath = parent?.path ?? [];
    const cappedParentPath = parentPath.length >= 6 ? parentPath.slice(0, 5) : parentPath;
    const path: PostId[] = [...cappedParentPath, id];

    const post: Post = {
      id,
      topicId: draft.topicId,
      parentId: (cappedParentPath[cappedParentPath.length - 1] as PostId | undefined) ?? null,
      author: this.currentAuthor(),
      bodyMarkdown: draft.bodyMarkdown,
      path,
      depth: path.length - 1,
      isOpeningPost: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      isRemoved: false,
    };

    this.posts = [...this.posts, post];
    this.topics = this.topics.map((topic) =>
      topic.id === draft.topicId
        ? {
            ...topic,
            replyCount: topic.replyCount + 1,
            lastActivityAt: post.createdAt,
          }
        : topic,
    );

    this.postEvents.next({ type: 'post-created', post });
    return post;
  }

  async editPost(id: PostId, bodyMarkdown: string): Promise<Post> {
    await this.delay();
    const updated = this.mapPost(id, (post) => ({
      ...post,
      bodyMarkdown,
      editedAt: new Date().toISOString(),
    }));
    this.postEvents.next({ type: 'post-updated', post: updated });
    return updated;
  }

  async removePost(id: PostId): Promise<void> {
    await this.delay();
    // Soft delete, exactly as the database does it: the row stays so replies
    // keep their place in the thread.
    const updated = this.mapPost(id, (post) => ({
      ...post,
      isRemoved: true,
      bodyMarkdown: '',
    }));
    this.postEvents.next({ type: 'post-updated', post: updated });
  }

  watchTopic(topicId: TopicId): Observable<PostEvent> {
    return new Observable<PostEvent>((subscriber) => {
      const subscription = this.postEvents.subscribe((event) => {
        if (event.post.topicId === topicId) {
          subscriber.next(event);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    await this.delay();

    const terms = parseSearchTerms(query);
    if (terms.length === 0) {
      return [];
    }

    // Every term has to appear, which is what people expect from a second
    // word: it narrows the result set rather than widening it.
    return this.topics
      .filter((topic) => terms.every((term) => findMatchRanges(topic.title, [term]).length > 0))
      .slice(0, limit)
      .map((topic) => ({
        topic,
        categorySlug:
          this.categories.find((category) => category.id === topic.categoryId)?.slug ?? '',
        excerpt: topic.title,
        matches: findMatchRanges(topic.title, terms),
      }));
  }

  private mapTopic(id: TopicId, change: (topic: Topic) => Topic): Topic {
    const existing = this.topics.find((topic) => topic.id === id);
    if (!existing) {
      throw new Error(`No topic with id ${id}`);
    }
    const updated = change(existing);
    this.topics = this.topics.map((topic) => (topic.id === id ? updated : topic));
    return updated;
  }

  private mapPost(id: PostId, change: (post: Post) => Post): Post {
    const existing = this.posts.find((post) => post.id === id);
    if (!existing) {
      throw new Error(`No post with id ${id}`);
    }
    const updated = change(existing);
    this.posts = this.posts.map((post) => (post.id === id ? updated : post));
    return updated;
  }

  private nextId(): string {
    this.sequence += 1;
    return String(this.sequence).padStart(4, '0');
  }

  private async delay(): Promise<void> {
    if (this.latencyMs <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}

function sortTopics(topics: readonly Topic[], sort: TopicQuery['sort']): Topic[] {
  const byPinnedFirst = (a: Topic, b: Topic) => Number(b.isPinned) - Number(a.isPinned);

  return [...topics].sort((a, b) => {
    const pinned = byPinnedFirst(a, b);
    if (pinned !== 0) {
      return pinned;
    }

    switch (sort) {
      case 'new':
        return b.createdAt.localeCompare(a.createdAt);
      case 'top':
        return b.replyCount - a.replyCount;
      default:
        return b.lastActivityAt.localeCompare(a.lastActivityAt);
    }
  });
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'topic'
  );
}
