import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { combineEpics, createEpicMiddleware } from 'redux-observable';

import { forumEpic, forumReducer } from '@/features/forum';

import type { Container } from '../di/container';

/**
 * The store, and the single place redux-observable is referenced.
 *
 * That isolation is deliberate: version 3 is still a release candidate. It is
 * the package's `latest` tag and the only release compatible with Redux 5, but
 * if it ever needs replacing, the substitute — an epic middleware is about
 * thirty lines of RxJS — goes here and nothing else changes.
 */
export function createStore(container: Container) {
  // The generics are spelled out so the root epic's action and dependency
  // types line up with what the middleware feeds it; inference alone widens
  // the action to `unknown` and every epic then fails to assign.
  const epicMiddleware = createEpicMiddleware<UnknownAction, UnknownAction, unknown, Container>({
    dependencies: container,
  });

  const store = configureStore({
    reducer: {
      forum: forumReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // The store holds plain data only; anything non-serialisable in it
        // breaks time-travel debugging and hydration.
        serializableCheck: true,
      }).concat(epicMiddleware),
  });

  epicMiddleware.run(combineEpics(forumEpic));

  return store;
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
