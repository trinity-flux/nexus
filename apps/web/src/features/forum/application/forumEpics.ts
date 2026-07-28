import type { UnknownAction } from '@reduxjs/toolkit';
import { combineEpics, type Epic, ofType } from 'redux-observable';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  mergeMap,
  of,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';

import { asPostId, asTopicId } from '../domain/entities';
import type {
  CategoryRepository,
  PostRepository,
  SearchRepository,
  TopicRepository,
} from '../domain/ports';
import {
  createTopic,
  loadCategories,
  loadThread,
  loadTopics,
  replyToTopic,
  searchQueryChanged,
  stopWatching,
  watchThread,
} from './forumCommands';
import { forumActions } from './forumSlice';

/**
 * The dependencies epics receive. Supplied by the store, which gets them from
 * the container — so an epic never imports an adapter and every test can hand
 * it the in-memory one.
 */
export interface ForumEpicDependencies {
  forum: {
    categories: CategoryRepository;
    topics: TopicRepository;
    posts: PostRepository;
    search: SearchRepository;
  };
}

/**
 * Long enough that an ordinary typing speed produces one request rather than
 * one per letter; short enough that the pause before results appear reads as
 * the network, not as the interface hesitating.
 */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * `UnknownAction` rather than a union of this feature's actions: the stream an
 * epic sees carries every action in the application, including those from
 * features it knows nothing about. Narrowing happens in `ofType`.
 */
export type ForumEpic = Epic<UnknownAction, UnknownAction, unknown, ForumEpicDependencies>;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

const loadCategoriesEpic: ForumEpic = (action$, _state$, { forum }) =>
  action$.pipe(
    ofType(loadCategories.type),
    // switchMap, not mergeMap: if the categories are requested twice the
    // second answer is the only one that matters, and the first request is
    // cancelled rather than left to arrive late and overwrite it.
    switchMap(() =>
      from(forum.categories.list()).pipe(
        map((categories) => forumActions.categoriesLoaded(categories)),
        catchError((error: unknown) => of(forumActions.requestFailed(describeError(error)))),
      ),
    ),
  );

const loadTopicsEpic: ForumEpic = (action$, _state$, { forum }) =>
  action$.pipe(
    ofType(loadTopics.type),
    // mergeMap here, because two different categories can legitimately be
    // loading at once and neither should cancel the other.
    mergeMap((action) => {
      const { categorySlug, sort, cursor } = (action as ReturnType<typeof loadTopics>).payload;

      return from(
        (async () => {
          const category = await forum.categories.findBySlug(categorySlug);
          if (!category) {
            throw new Error(`No category called ${categorySlug}`);
          }
          const page = await forum.topics.list({
            categoryId: category.id,
            sort,
            cursor: cursor ?? null,
          });
          return { page, append: Boolean(cursor) };
        })(),
      ).pipe(
        map(({ page, append }) =>
          forumActions.topicsLoaded({
            categorySlug,
            items: page.items,
            nextCursor: page.nextCursor,
            append,
          }),
        ),
        catchError((error: unknown) => of(forumActions.requestFailed(describeError(error)))),
      );
    }),
  );

const loadThreadEpic: ForumEpic = (action$, _state$, { forum }) =>
  action$.pipe(
    ofType(loadThread.type),
    switchMap((action) => {
      const { categorySlug, topicSlug } = (action as ReturnType<typeof loadThread>).payload;

      return from(
        (async () => {
          const topic = await forum.topics.findBySlug(categorySlug, topicSlug);
          if (!topic) {
            throw new Error('That topic does not exist.');
          }
          const posts = await forum.posts.listByTopic(topic.id);
          return { topic, posts };
        })(),
      ).pipe(
        map(({ topic, posts }) => forumActions.threadLoaded({ topic, posts })),
        catchError((error: unknown) => of(forumActions.requestFailed(describeError(error)))),
      );
    }),
  );

/**
 * Server-pushed updates for the thread on screen.
 *
 * This is the case Redux Toolkit alone handles poorly and RxJS handles
 * naturally: an open-ended stream that has to stop cleanly. `takeUntil`
 * unsubscribes when the user navigates away, and `switchMap` guarantees only
 * one thread is ever subscribed.
 */
const watchThreadEpic: ForumEpic = (action$, _state$, { forum }) =>
  action$.pipe(
    ofType(watchThread.type),
    switchMap((action) => {
      const { topicId } = (action as ReturnType<typeof watchThread>).payload;

      return forum.posts.watchTopic(asTopicId(topicId)).pipe(
        map((event) => forumActions.postReceived(event.post)),
        takeUntil(action$.pipe(ofType(stopWatching.type))),
        catchError(() => of(forumActions.requestFailed('Live updates stopped.'))),
      );
    }),
  );

/**
 * Posting a topic.
 *
 * `concatMap`, not `switchMap`: a write is not a query. Cancelling a request
 * that has already reached the server does not undo it, it only loses the
 * answer — so a double submission would create two topics and the UI would
 * know about neither.
 */
const createTopicEpic: ForumEpic = (action$, _state$, { forum }) =>
  action$.pipe(
    ofType(createTopic.type),
    concatMap((action) => {
      const { categorySlug, title, bodyMarkdown } = (action as ReturnType<typeof createTopic>)
        .payload;

      return from(
        (async () => {
          const category = await forum.categories.findBySlug(categorySlug);
          if (!category) {
            throw new Error(`No category called ${categorySlug}`);
          }
          return forum.topics.create({ categoryId: category.id, title, bodyMarkdown });
        })(),
      ).pipe(
        map((topic) => forumActions.topicCreated({ categorySlug, topic })),
        startWith(forumActions.writeStarted()),
        catchError((error: unknown) => of(forumActions.requestFailed(describeError(error)))),
      );
    }),
  );

const replyEpic: ForumEpic = (action$, _state$, { forum }) =>
  action$.pipe(
    ofType(replyToTopic.type),
    concatMap((action) => {
      const { topicId, parentId, bodyMarkdown } = (action as ReturnType<typeof replyToTopic>)
        .payload;

      return from(
        forum.posts.reply({
          topicId: asTopicId(topicId),
          parentId: parentId ? asPostId(parentId) : null,
          bodyMarkdown,
        }),
      ).pipe(
        map((post) => forumActions.replyPosted(post)),
        startWith(forumActions.writeStarted()),
        catchError((error: unknown) => of(forumActions.requestFailed(describeError(error)))),
      );
    }),
  );

/**
 * Search as you type.
 *
 * The one place in the application where RxJS is not a stylistic choice.
 * Three operators, each removing a defect that is otherwise written by hand
 * and written wrong:
 *
 * - `debounceTime` stops a request per keystroke. Someone typing "northrend"
 *   would otherwise send nine.
 * - `distinctUntilChanged` drops the request that adding and deleting a
 *   character would produce, and the one from a keystroke that only moved the
 *   cursor.
 * - `switchMap` cancels the request in flight when a newer one starts. This is
 *   the classic bug: type "no", type "northrend", and the slow answer to "no"
 *   lands last and overwrites the right results. Here it cannot, because the
 *   first request is unsubscribed rather than left to finish.
 */
const searchEpic: ForumEpic = (action$, _state$, { forum }) =>
  action$.pipe(
    ofType(searchQueryChanged.type),
    map((action) => (action as ReturnType<typeof searchQueryChanged>).payload.query.trim()),
    debounceTime(SEARCH_DEBOUNCE_MS),
    distinctUntilChanged(),
    switchMap((query) => {
      if (query.length === 0) {
        // Clearing the box is not a search. Emitting the empty request lets
        // the reducer reset the results without a round trip.
        return of(forumActions.searchRequested(''));
      }

      return from(forum.search.search(query)).pipe(
        map((results) => forumActions.searchCompleted({ query, results })),
        startWith(forumActions.searchRequested(query)),
        catchError((error: unknown) => of(forumActions.requestFailed(describeError(error)))),
      );
    }),
  );

export const forumEpic = combineEpics(
  loadCategoriesEpic,
  loadTopicsEpic,
  loadThreadEpic,
  watchThreadEpic,
  createTopicEpic,
  replyEpic,
  searchEpic,
);
