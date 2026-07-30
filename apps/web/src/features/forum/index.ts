/**
 * The forum's public surface.
 *
 * Everything outside this feature imports from here and nowhere deeper — a
 * rule Biome enforces, so a shortcut into `application/` fails the build
 * rather than quietly coupling two features to each other's internals.
 *
 * Route components are NOT here. They live in `pages.ts`, because the store
 * imports this file at startup and a barrel is loaded whole — see the comment
 * there.
 */

export {
  createTopic,
  loadCategories,
  loadThread,
  loadTopics,
  replyToTopic,
  searchQueryChanged,
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
  BODY_MAX_LENGTH,
  type DraftProblem,
  isSubmittable,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateBody,
  validateTitle,
  validateTopicDraft,
} from './domain/drafts';
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
export {
  findMatchRanges,
  parseSearchTerms,
  splitByRanges,
  type TextRange,
  type TextSegment,
} from './domain/highlight';
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
