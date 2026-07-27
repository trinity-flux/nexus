/**
 * The forum as the application talks about it.
 *
 * Deliberately not the database row shape. Rows carry `snake_case` names,
 * nullable foreign keys and denormalised counters that exist for Postgres's
 * benefit; these carry the vocabulary the product uses. The translation
 * between them happens once, in `infrastructure/mappers.ts`, which is what
 * keeps a schema change from rippling into every component.
 */

export type CategoryId = string & { readonly __brand: 'CategoryId' };
export type TopicId = string & { readonly __brand: 'TopicId' };
export type PostId = string & { readonly __brand: 'PostId' };
export type ProfileId = string & { readonly __brand: 'ProfileId' };

/**
 * Branded so a `TopicId` cannot be passed where a `PostId` belongs. Both are
 * uuid strings at runtime, and mixing them up is otherwise a silent bug that
 * only shows as an empty page.
 */
export function asCategoryId(value: string): CategoryId {
  return value as CategoryId;
}
export function asTopicId(value: string): TopicId {
  return value as TopicId;
}
export function asPostId(value: string): PostId {
  return value as PostId;
}
export function asProfileId(value: string): ProfileId {
  return value as ProfileId;
}

export interface Author {
  id: ProfileId;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'member' | 'moderator' | 'admin';
}

export interface Category {
  id: CategoryId;
  slug: string;
  name: string;
  description: string | null;
  isLocked: boolean;
  allowsAnonymous: boolean;
  topicCount: number;
}

export interface Topic {
  id: TopicId;
  categoryId: CategoryId;
  slug: string;
  title: string;
  /** Null when the author deleted their account. The topic outlives them. */
  author: Author | null;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface Post {
  id: PostId;
  topicId: TopicId;
  parentId: PostId | null;
  author: Author | null;
  bodyMarkdown: string;
  /**
   * Ancestry from the root down to and including this post. The client rebuilds
   * the reply tree from this rather than from `parentId`, which is what lets a
   * thread survive a removed post in the middle of it.
   */
  path: PostId[];
  depth: number;
  isOpeningPost: boolean;
  editedAt: string | null;
  createdAt: string;
  /**
   * True when the post was removed. The body is not present — the database
   * never sends it — and the UI renders a placeholder that keeps the shape of
   * the conversation.
   */
  isRemoved: boolean;
}

/** How deep replies may nest. Mirrors the constraint in the database. */
export const MAX_REPLY_DEPTH = 5;

export interface Page<T> {
  items: T[];
  /** Opaque marker for the next page, or null when there are no more. */
  nextCursor: string | null;
}

export type TopicSort = 'recent' | 'new' | 'top';

export interface TopicQuery {
  categoryId: CategoryId;
  sort: TopicSort;
  cursor?: string | null;
  limit?: number;
}
