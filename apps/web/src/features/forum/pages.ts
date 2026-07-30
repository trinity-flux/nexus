/**
 * The forum's route components, as a separate public entry point.
 *
 * Split out of `index.ts` because a barrel is loaded whole. The store and the
 * dependency container import `forumReducer`, `forumEpic` and
 * `createInMemoryForum` from `index.ts` at startup, and while the pages were
 * re-exported from the same file, that eager import pulled every page — and
 * with them `marked` and `DOMPurify` — into the initial bundle. The router's
 * `lazy()` calls were real but ineffective, which Rolldown reports as
 * INEFFECTIVE_DYNAMIC_IMPORT and which nothing else would have shown.
 *
 * This is still the feature's public surface, not a reach into its internals:
 * everything here is a declared export of the feature, and nothing outside it
 * imports `presentation/` directly.
 */

export { CategoriesPage } from './presentation/CategoriesPage';
export { CategoryPage } from './presentation/CategoryPage';
export { NewTopicPage } from './presentation/NewTopicPage';
export { SearchPage } from './presentation/SearchPage';
export { TopicPage } from './presentation/TopicPage';
