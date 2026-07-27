import type { Observable } from 'rxjs';

import type { AuthFailure, Credentials, Session } from './entities';

/**
 * Sign-in either works or fails for a reason the UI can act on. Modelled as a
 * result rather than a thrown error, because "wrong password" is an expected
 * outcome of a sign-in form, not an exception.
 */
export type AuthResult = { ok: true; session: Session } | { ok: false; failure: AuthFailure };

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
