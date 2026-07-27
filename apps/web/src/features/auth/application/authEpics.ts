import type { UnknownAction } from '@reduxjs/toolkit';
import { combineEpics, type Epic, ofType } from 'redux-observable';
import { catchError, EMPTY, from, map, mergeMap, of, startWith, switchMap } from 'rxjs';

import type { AuthRepository, AuthResult } from '../domain/ports';
import { signIn, signInWithDiscord, signOut, signUp, watchSession } from './authCommands';
import { authActions } from './authSlice';

export interface AuthEpicDependencies {
  auth: AuthRepository;
}

export type AuthEpic = Epic<UnknownAction, UnknownAction, unknown, AuthEpicDependencies>;

/**
 * The one source of truth about who is signed in.
 *
 * Sign-in and sign-out never write the member into the store themselves. They
 * ask the repository to act, and the answer arrives through this stream — so a
 * token refresh, an expiry, or a sign-out performed in another tab moves this
 * tab through exactly the same path as a click on the button. Two code paths
 * for "who is signed in" is how two open tabs end up disagreeing.
 */
const watchSessionEpic: AuthEpic = (action$, _state$, { auth }) =>
  action$.pipe(
    ofType(watchSession.type),
    switchMap(() =>
      auth.onSessionChange().pipe(
        map((session) => authActions.sessionChanged(session)),
        catchError(() => of(authActions.submissionFailed('unknown'))),
      ),
    ),
  );

/**
 * Reports only failures.
 *
 * On success it emits nothing at all: the session stream above is already
 * about to deliver the new member, and dispatching here too would set the
 * state twice from two places.
 */
function reportOnlyFailure(result: AuthResult) {
  return result.ok ? EMPTY : of(authActions.submissionFailed(result.failure));
}

const signInEpic: AuthEpic = (action$, _state$, { auth }) =>
  action$.pipe(
    ofType(signIn.type),
    // switchMap: a second submission supersedes the first, so a slow answer to
    // an abandoned attempt cannot arrive later and sign someone in.
    switchMap((action) =>
      from(auth.signIn((action as ReturnType<typeof signIn>).payload)).pipe(
        mergeMap(reportOnlyFailure),
        startWith(authActions.submissionStarted()),
        catchError(() => of(authActions.submissionFailed('network'))),
      ),
    ),
  );

const signUpEpic: AuthEpic = (action$, _state$, { auth }) =>
  action$.pipe(
    ofType(signUp.type),
    switchMap((action) =>
      from(auth.signUp((action as ReturnType<typeof signUp>).payload)).pipe(
        mergeMap(reportOnlyFailure),
        startWith(authActions.submissionStarted()),
        catchError(() => of(authActions.submissionFailed('network'))),
      ),
    ),
  );

const signInWithDiscordEpic: AuthEpic = (action$, _state$, { auth }) =>
  action$.pipe(
    ofType(signInWithDiscord.type),
    switchMap(() =>
      from(auth.signInWithDiscord()).pipe(
        mergeMap(() => EMPTY),
        startWith(authActions.submissionStarted()),
        catchError(() => of(authActions.submissionFailed('network'))),
      ),
    ),
  );

const signOutEpic: AuthEpic = (action$, _state$, { auth }) =>
  action$.pipe(
    ofType(signOut.type),
    switchMap(() =>
      from(auth.signOut()).pipe(
        mergeMap(() => EMPTY),
        catchError(() => of(authActions.submissionFailed('network'))),
      ),
    ),
  );

export const authEpic = combineEpics(
  watchSessionEpic,
  signInEpic,
  signUpEpic,
  signInWithDiscordEpic,
  signOutEpic,
);
