import { createAction } from '@reduxjs/toolkit';

import type { Credentials } from '../domain/entities';

/** Starts watching for session changes. Dispatched once, at startup. */
export const watchSession = createAction('auth/watchSession');

export const signIn = createAction<Credentials>('auth/signIn');
export const signUp = createAction<Credentials>('auth/signUp');
export const signInWithDiscord = createAction('auth/signInWithDiscord');
export const signOut = createAction('auth/signOut');
