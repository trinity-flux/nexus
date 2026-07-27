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
