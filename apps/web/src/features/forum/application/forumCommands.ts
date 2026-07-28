import { createAction } from '@reduxjs/toolkit';

import type { TopicSort } from '../domain/entities';

/**
 * Intent, separated from state change.
 *
 * A component dispatches "I want the categories" and is done. An epic turns
 * that into a request, a cancellation and a result. Keeping the two vocabularies
 * apart is what stops a reducer from ever needing to know about the network.
 */
export const loadCategories = createAction('forum/loadCategories');

export const loadTopics = createAction<{
  categorySlug: string;
  sort: TopicSort;
  cursor?: string | null;
}>('forum/loadTopics');

export const loadThread = createAction<{ categorySlug: string; topicSlug: string }>(
  'forum/loadThread',
);

/** Starts a realtime subscription. Emits until `stopWatching`. */
export const watchThread = createAction<{ topicId: string }>('forum/watchThread');
export const stopWatching = createAction('forum/stopWatching');

export const createTopic = createAction<{
  categorySlug: string;
  title: string;
  bodyMarkdown: string;
}>('forum/createTopic');

export const replyToTopic = createAction<{
  topicId: string;
  parentId: string | null;
  bodyMarkdown: string;
}>('forum/replyToTopic');

/**
 * Dispatched on every keystroke.
 *
 * The debounce lives in the epic, not here and not in the component: a
 * component that debounces its own dispatches has to own a timer, cancel it on
 * unmount, and gets it wrong the first time someone renders two search boxes.
 */
export const searchQueryChanged = createAction<{ query: string }>('forum/searchQueryChanged');
