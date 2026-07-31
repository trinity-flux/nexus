import type { Observable } from 'rxjs';

import type { AuthFailure, Credentials, Session } from './entities';

/**
 * How an attempt to sign in or sign up ended.
 *
 * A result rather than a thrown error, because "wrong password" is an expected
 * outcome of a sign-in form, not an exception.
 *
 * Discriminated by `status` and not by a boolean `ok`. There are three
 * outcomes, not two: a project that requires email confirmation accepts the
 * sign-up and issues no session, which is neither a success the UI can act on
 * nor a failure to apologise for. With a boolean, that third case has to
 * pretend to be one of the other two — and under `result.ok ? …` a truthy
 * marker would silently take the success branch.
 */
export type AuthResult =
  | { status: 'signed-in'; session: Session }
  | { status: 'confirmation-required' }
  | { status: 'failed'; failure: AuthFailure };

export interface AuthRepository {
  /** The session restored from storage at startup, if any. */
  currentSession(): Promise<Session | null>;
  signIn(credentials: Credentials): Promise<AuthResult>;
  signUp(credentials: Credentials): Promise<AuthResult>;
  /** Hands off to Discord. Resolves when the redirect has been started. */
  signInWithDiscord(): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Emits on every change, including ones this tab did not cause: a token
   * refresh, or a sign-out in another tab. Without it, two open tabs disagree
   * about who is signed in until one of them is reloaded.
   */
  onSessionChange(): Observable<Session | null>;
}
