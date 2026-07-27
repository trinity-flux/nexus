/**
 * The forum's public surface.
 *
 * Everything outside this feature imports from here and nowhere deeper — a
 * rule Biome enforces, so a shortcut into `application/` fails the build
 * rather than quietly coupling two features to each other's internals.
 */

export {
  loadCategories,
  loadThread,
  loadTopics,
  stopWatching,
  watchThread,
} from './application/forumCommands';
export { type ForumEpicDependencies, forumEpic } from './application/forumEpics';
export {
  type ForumState,
  forumActions,
  forumReducer,
  type LoadState,
} from './application/forumSlice';
export {
  type Author,
  asCategoryId,
  asPostId,
  asProfileId,
  asTopicId,
  type Category,
  type CategoryId,
  MAX_REPLY_DEPTH,
  type Page,
  type Post,
  type PostId,
  type Topic,
  type TopicId,
  type TopicQuery,
  type TopicSort,
} from './domain/entities';
export type {
  CategoryRepository,
  PostEvent,
  PostRepository,
  ReplyDraft,
  SearchRepository,
  SearchResult,
  TopicDraft,
  TopicEvent,
  TopicRepository,
} from './domain/ports';
export { buildThreadTree, countPosts, type ThreadNode } from './domain/threadTree';

export { createInMemoryForum } from './infrastructure/createInMemoryForum';

export { CategoriesPage } from './presentation/CategoriesPage';
export { CategoryPage } from './presentation/CategoryPage';
export { TopicPage } from './presentation/TopicPage';
