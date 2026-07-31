import type { SupabaseClient, Session as SupabaseSession, User } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

import {
  type AuthFailure,
  asMemberId,
  type Credentials,
  type CurrentMember,
  type MemberRole,
  type Session,
} from '../domain/entities';
import type { AuthRepository, AuthResult } from '../domain/ports';

interface ProfileRow {
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: MemberRole;
  banned_until: string | null;
}

/**
 * Authentication, against Supabase.
 *
 * Two facts drive the shape of this. A Supabase session carries an auth user —
 * id, email, tokens — and nothing the forum displays; the username, avatar and
 * role live in `public.profiles`, created by the `handle_new_user` trigger. So
 * every session has to be joined with a profile read before it means anything
 * to the application.
 *
 * And the profile can change without the session changing: a moderator
 * promoting someone does not issue a new token. The role is therefore read
 * fresh on each session event rather than cached from sign-in, which is what
 * keeps a promotion from requiring a sign-out to take effect.
 */
export class SupabaseAuthRepository implements AuthRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async currentSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession();
    return data.session ? this.toSession(data.session) : null;
  }

  async signIn(credentials: Credentials): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error || !data.session) {
      return { status: 'failed', failure: describeFailure(error?.message) };
    }

    const session = await this.toSession(data.session);
    return session ? { status: 'signed-in', session } : { status: 'failed', failure: 'unknown' };
  }

  async signUp(credentials: Credentials): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { status: 'failed', failure: describeFailure(error.message) };
    }

    // A null session with no error means the project requires email
    // confirmation. The account exists and the next step is in the member's
    // inbox, which is why this is its own outcome and not a failure.
    if (!data.session) {
      return { status: 'confirmation-required' };
    }

    const session = await this.toSession(data.session);
    return session ? { status: 'signed-in', session } : { status: 'failed', failure: 'unknown' };
  }

  async signInWithDiscord(): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        // Back to where the app is mounted, which is not the origin: on Pages
        // this lives under a sub-path, and the default would drop the member
        // on a 404.
        redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  onSessionChange(): Observable<Session | null> {
    return new Observable<Session | null>((subscriber) => {
      // Emits immediately with the restored session, then on every change —
      // including a token refresh and a sign-out in another tab, which is the
      // whole reason this is a stream and not a one-off read.
      const { data } = this.client.auth.onAuthStateChange((_event, supabaseSession) => {
        if (!supabaseSession) {
          subscriber.next(null);
          return;
        }

        this.toSession(supabaseSession)
          .then((session) => subscriber.next(session))
          .catch(() => subscriber.next(null));
      });

      return () => {
        data.subscription.unsubscribe();
      };
    });
  }

  /**
   * Joins an auth session with the profile that describes it.
   *
   * Returns null when the profile is missing, which is not a normal state: the
   * trigger creates one for every account. Treating it as "signed out" rather
   * than throwing means a half-created account cannot lock someone out of the
   * whole application.
   */
  private async toSession(supabaseSession: SupabaseSession): Promise<Session | null> {
    const member = await this.readMember(supabaseSession.user);
    if (!member) {
      return null;
    }

    return {
      member,
      expiresAt: new Date((supabaseSession.expires_at ?? 0) * 1000).toISOString(),
    };
  }

  private async readMember(user: User): Promise<CurrentMember | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('username, display_name, avatar_url, role, banned_until')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const profile = data as ProfileRow;
    return {
      id: asMemberId(user.id),
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      bannedUntil: profile.banned_until,
    };
  }
}

/**
 * Maps Supabase's message to a failure the UI can translate.
 *
 * Wrong password and unknown address deliberately collapse into one value.
 * Supabase already returns the same message for both, and keeping them
 * indistinguishable is what stops the sign-in form from answering "is this
 * address registered here?" for anyone who asks.
 */
function describeFailure(message: string | undefined): AuthFailure {
  if (!message) {
    return 'unknown';
  }

  const normalised = message.toLowerCase();

  if (normalised.includes('already registered') || normalised.includes('already been registered')) {
    return 'email-taken';
  }
  if (normalised.includes('invalid login credentials')) {
    return 'invalid-credentials';
  }
  if (normalised.includes('network')) {
    return 'network';
  }
  return 'unknown';
}
