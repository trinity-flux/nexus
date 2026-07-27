import { BehaviorSubject, type Observable } from 'rxjs';

import {
  asMemberId,
  type Credentials,
  type CurrentMember,
  MINIMUM_PASSWORD_LENGTH,
  type Session,
} from '../domain/entities';
import type { AuthRepository, AuthResult } from '../domain/ports';

const SESSION_STORAGE_KEY = 'trinity-nexus.session';
const SESSION_LIFETIME_MS = 60 * 60 * 1000;

/**
 * Accounts that exist while there is no backend.
 *
 * Different roles on purpose: moderator-only controls cannot be checked
 * against a single test account, and "it worked for me" is exactly how a
 * permission bug ships.
 */
const KNOWN_MEMBERS: Array<{ email: string; password: string; member: CurrentMember }> = [
  {
    email: 'thrall@example.test',
    password: 'warchief',
    member: {
      id: asMemberId('p-thrall'),
      username: 'thrall',
      displayName: 'Thrall',
      avatarUrl: null,
      role: 'admin',
      bannedUntil: null,
    },
  },
  {
    email: 'jaina@example.test',
    password: 'kirintor',
    member: {
      id: asMemberId('p-jaina'),
      username: 'jaina',
      displayName: 'Jaina Proudmoore',
      avatarUrl: null,
      role: 'moderator',
      bannedUntil: null,
    },
  },
  {
    email: 'rexxar@example.test',
    password: 'beastmaster',
    member: {
      id: asMemberId('p-rexxar'),
      username: 'rexxar',
      displayName: 'Rexxar',
      avatarUrl: null,
      role: 'member',
      bannedUntil: null,
    },
  },
];

/**
 * Authentication with no backend.
 *
 * Passwords are compared in plain text and that is fine here, precisely
 * because it is obviously not fine anywhere else: nothing about this file can
 * be mistaken for something that could go to production. When Supabase
 * arrives, this is replaced by an adapter behind the same port and no caller
 * changes.
 */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly sessions: BehaviorSubject<Session | null>;
  private readonly registered: Array<{ email: string; password: string; member: CurrentMember }>;
  private readonly latencyMs: number;

  constructor(latencyMs = 400) {
    this.latencyMs = latencyMs;
    this.registered = [...KNOWN_MEMBERS];
    this.sessions = new BehaviorSubject<Session | null>(readStoredSession());
  }

  async currentSession(): Promise<Session | null> {
    const session = this.sessions.value;

    // An expired session in storage is worse than none: the UI renders as
    // signed in and then every write fails.
    if (session && new Date(session.expiresAt).getTime() <= Date.now()) {
      this.publish(null);
      return null;
    }

    return session;
  }

  async signIn({ email, password }: Credentials): Promise<AuthResult> {
    await this.delay();

    const match = this.registered.find(
      (entry) => entry.email.toLowerCase() === email.trim().toLowerCase(),
    );

    // One failure for both "no such account" and "wrong password". Telling
    // them apart lets anyone test which email addresses are registered here.
    if (!match || match.password !== password) {
      return { ok: false, failure: 'invalid-credentials' };
    }

    const session = startSession(match.member);
    this.publish(session);
    return { ok: true, session };
  }

  async signUp({ email, password }: Credentials): Promise<AuthResult> {
    await this.delay();

    const normalised = email.trim().toLowerCase();

    if (this.registered.some((entry) => entry.email.toLowerCase() === normalised)) {
      return { ok: false, failure: 'email-taken' };
    }

    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      return { ok: false, failure: 'weak-password' };
    }

    const username = normalised.split('@')[0]?.replace(/[^a-z0-9_]/g, '') || 'member';
    const member: CurrentMember = {
      id: asMemberId(`p-${crypto.randomUUID()}`),
      username,
      displayName: username,
      avatarUrl: null,
      role: 'member',
      bannedUntil: null,
    };

    this.registered.push({ email: normalised, password, member });

    const session = startSession(member);
    this.publish(session);
    return { ok: true, session };
  }

  async signInWithDiscord(): Promise<void> {
    await this.delay();
    // No redirect to make without a backend. Signing in as the seeded member
    // keeps the button honest about what it will eventually do.
    const fallback = this.registered[2] ?? this.registered[0];
    if (fallback) {
      this.publish(startSession(fallback.member));
    }
  }

  async signOut(): Promise<void> {
    await this.delay();
    this.publish(null);
  }

  onSessionChange(): Observable<Session | null> {
    return this.sessions.asObservable();
  }

  private publish(session: Session | null): void {
    writeStoredSession(session);
    this.sessions.next(session);
  }

  private async delay(): Promise<void> {
    if (this.latencyMs <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}

function startSession(member: CurrentMember): Session {
  return {
    member,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS).toISOString(),
  };
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Session;
    // Shape-checked rather than trusted: storage is editable by anyone with
    // devtools, and a malformed object here crashes the whole app on boot.
    return parsed.member?.id && parsed.expiresAt ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: Session | null): void {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    /* Private mode. The session survives in memory for this tab. */
  }
}
