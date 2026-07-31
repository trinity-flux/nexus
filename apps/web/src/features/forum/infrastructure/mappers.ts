import {
  type Author,
  asCategoryId,
  asPostId,
  asProfileId,
  asTopicId,
  type Category,
  type Post,
  type Topic,
} from '../domain/entities';

/**
 * Translation between database rows and the vocabulary the product uses.
 *
 * It happens here and nowhere else. Rows carry `snake_case`, nullable foreign
 * keys and counters that exist for Postgres's benefit; entities carry the words
 * the forum is described in. Keeping the conversion in one file is what stops a
 * column rename from reaching a component — the whole reason the domain does
 * not simply use the row types.
 *
 * The shapes below are what the queries in `SupabaseForumRepository` select,
 * including the joined author. They are written out rather than imported from
 * `@trinity-nexus/db` because a query's projection is narrower than a table:
 * `search_vector` and `deleted_at` are on every row and neither is selected.
 */

export interface ProfileJoin {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: 'member' | 'moderator' | 'admin';
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_locked: boolean;
  allow_anonymous: boolean;
}

export interface TopicDto {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  /**
   * Supabase returns an object for a to-one relationship and null when the
   * foreign key is null — which happens here, because a topic outlives the
   * account that wrote it.
   */
  author: ProfileJoin | null;
}

export interface PostDto {
  id: string;
  topic_id: string;
  parent_id: string | null;
  body_md: string | null;
  path: string[];
  depth: number;
  is_opening_post: boolean;
  edited_at: string | null;
  created_at: string;
  deleted_at: string | null;
  author: ProfileJoin | null;
}

export function toAuthor(profile: ProfileJoin | null): Author | null {
  if (!profile) {
    return null;
  }

  return {
    id: asProfileId(profile.id),
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
  };
}

export function toCategory(row: CategoryDto, topicCount: number): Category {
  return {
    id: asCategoryId(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description,
    isLocked: row.is_locked,
    allowsAnonymous: row.allow_anonymous,
    topicCount,
  };
}

export function toTopic(row: TopicDto): Topic {
  return {
    id: asTopicId(row.id),
    categoryId: asCategoryId(row.category_id),
    slug: row.slug,
    title: row.title,
    author: toAuthor(row.author),
    isPinned: row.is_pinned,
    isLocked: row.is_locked,
    replyCount: row.reply_count,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
  };
}

export function toPost(row: PostDto): Post {
  const isRemoved = row.deleted_at !== null;

  return {
    id: asPostId(row.id),
    topicId: asTopicId(row.topic_id),
    parentId: row.parent_id ? asPostId(row.parent_id) : null,
    author: isRemoved ? null : toAuthor(row.author),
    // A removed post has no body to show. The policy withholds it, so this is
    // a fallback for a row that arrives through realtime before the policy
    // has filtered it — never a place to put the original text back.
    bodyMarkdown: isRemoved ? '' : (row.body_md ?? ''),
    path: row.path.map(asPostId),
    depth: row.depth,
    isOpeningPost: row.is_opening_post,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    isRemoved,
  };
}
