import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AuthFailure, CurrentMember, Session } from '../domain/entities';

export interface AuthState {
  member: CurrentMember | null;
  /**
   * `unknown` until the stored session has been checked. The distinction from
   * `signed-out` matters: without it, every guarded route flashes its
   * signed-out state for one frame on every page load.
   */
  status: 'unknown' | 'signed-in' | 'signed-out';
  /** True while a sign-in or sign-up request is in flight. */
  submitting: boolean;
  failure: AuthFailure | null;
}

const initialState: AuthState = {
  member: null,
  status: 'unknown',
  submitting: false,
  failure: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    submissionStarted(state) {
      state.submitting = true;
      state.failure = null;
    },
    sessionChanged(state, action: PayloadAction<Session | null>) {
      state.member = action.payload?.member ?? null;
      state.status = action.payload ? 'signed-in' : 'signed-out';
      state.submitting = false;
      state.failure = null;
    },
    submissionFailed(state, action: PayloadAction<AuthFailure>) {
      state.submitting = false;
      state.failure = action.payload;
      // Deliberately not touching `status`: a failed sign-in leaves the
      // visitor exactly where they were, signed out but not newly so.
      if (state.status === 'unknown') {
        state.status = 'signed-out';
      }
    },
    failureCleared(state) {
      state.failure = null;
    },
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
