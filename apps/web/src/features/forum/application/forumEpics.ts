import type { UnknownAction } from '@reduxjs/toolkit';
import { combineEpics, type Epic, ofType } from 'redux-observable';
import { catchError, from, map, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { asTopicId } from '../domain/entities';
import type { CategoryRepository, PostRepository, TopicRepository } from '../domain/ports';
import { loadCategories, loadThread, loadTopics, stopWatching, watchThread } from './forumCommands';
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
  };
}

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

export const forumEpic = combineEpics(
  loadCategoriesEpic,
  loadTopicsEpic,
  loadThreadEpic,
  watchThreadEpic,
);
