import type { Observable } from 'rxjs';

import type {
  Category,
  CategoryId,
  Page,
  Post,
  PostId,
  Topic,
  TopicId,
  TopicQuery,
} from './entities';
import type { TextRange } from './highlight';

/**
 * What the forum needs from the outside world, stated as interfaces.
 *
 * These are the seam. `infrastructure/` implements them against Supabase and
 * against an in-memory store; nothing above this file knows which one is
 * running. Replacing Supabase means writing one more implementation, not
 * touching the application or the UI.
 *
 * RxJS appears here on purpose and is the only external type allowed in the
 * domain: a server-pushed stream has to be described by something, and
 * `Observable` describes it without implying who produces it.
 */

export interface TopicDraft {
  categoryId: CategoryId;
  title: string;
  bodyMarkdown: string;
}

export interface ReplyDraft {
  topicId: TopicId;
  parentId: PostId | null;
  bodyMarkdown: string;
}

/** What changed in a topic, as pushed by the server. */
export type TopicEvent =
  | { type: 'topic-created'; topic: Topic }
  | { type: 'topic-updated'; topic: Topic };

export type PostEvent = { type: 'post-created'; post: Post } | { type: 'post-updated'; post: Post };

export interface CategoryRepository {
  list(): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
}

export interface TopicRepository {
  list(query: TopicQuery): Promise<Page<Topic>>;
  findBySlug(categorySlug: string, topicSlug: string): Promise<Topic | null>;
  create(draft: TopicDraft): Promise<Topic>;
  updateTitle(id: TopicId, title: string): Promise<Topic>;
  remove(id: TopicId): Promise<void>;
  /** Emits until unsubscribed. Cancellation is the caller's business. */
  watchCategory(categoryId: CategoryId): Observable<TopicEvent>;
}

export interface PostRepository {
  /**
   * Every post in a topic, ordered by `path` so the caller can build the tree
   * in one pass. Threads are bounded — five levels, and a topic is paginated
   * before it grows past a few hundred posts — so this is one query rather
   * than a request per branch.
   */
  listByTopic(topicId: TopicId): Promise<Post[]>;
  reply(draft: ReplyDraft): Promise<Post>;
  edit(id: PostId, bodyMarkdown: string): Promise<Post>;
  remove(id: PostId): Promise<void>;
  watchTopic(topicId: TopicId): Observable<PostEvent>;
}

export interface SearchResult {
  topic: Topic;
  /**
   * The slug of the topic's category.
   *
   * Carried on the result rather than looked up by the caller: a topic's URL
   * needs it, and resolving it here is one join in the query instead of a
   * request per result.
   */
  categorySlug: string;
  /** The matching fragment, as plain text. */
  excerpt: string;
  /**
   * Where the query terms sit inside `excerpt`.
   *
   * Offsets rather than a string with `<mark>` in it: the excerpt is text a
   * stranger wrote, and markup assembled around it would have to be sanitised
   * again before it could be rendered. An offset cannot carry a payload.
   */
  matches: TextRange[];
}

export interface SearchRepository {
  search(query: string, limit?: number): Promise<SearchResult[]>;
}
