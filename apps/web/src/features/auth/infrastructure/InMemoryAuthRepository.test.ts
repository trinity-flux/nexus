import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryAuthRepository } from './InMemoryAuthRepository';

function repository() {
  // No simulated latency: these assert behaviour, not the loading states.
  return new InMemoryAuthRepository(0);
}

beforeEach(() => {
  localStorage.clear();
});

describe('signIn', () => {
  it('accepts a known member', async () => {
    const result = await repository().signIn({
      email: 'jaina@example.test',
      password: 'kirintor',
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.session.member.role).toBe('moderator');
  });

  it('ignores case and surrounding whitespace in the email', async () => {
    const result = await repository().signIn({
      email: '  Jaina@Example.Test  ',
      password: 'kirintor',
    });

    expect(result.ok).toBe(true);
  });

  it('gives the same failure for a wrong password and an unknown account', async () => {
    const auth = repository();

    const wrongPassword = await auth.signIn({
      email: 'jaina@example.test',
      password: 'nope',
    });
    const unknownAccount = await auth.signIn({
      email: 'nobody@example.test',
      password: 'nope',
    });

    // Telling them apart turns the sign-in form into a way to test which email
    // addresses have accounts here.
    expect(wrongPassword).toEqual({ ok: false, failure: 'invalid-credentials' });
    expect(unknownAccount).toEqual({ ok: false, failure: 'invalid-credentials' });
  });
});

describe('signUp', () => {
  it('creates a member and signs them in', async () => {
    const result = await repository().signUp({
      email: 'newcomer@example.test',
      password: 'longenoughpassword',
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.session.member.username).toBe('newcomer');
    expect(result.ok && result.session.member.role).toBe('member');
  });

  it('refuses an email that is already registered', async () => {
    const result = await repository().signUp({
      email: 'jaina@example.test',
      password: 'longenoughpassword',
    });

    expect(result).toEqual({ ok: false, failure: 'email-taken' });
  });

  it('refuses a short password', async () => {
    const result = await repository().signUp({
      email: 'newcomer@example.test',
      password: 'short',
    });

    expect(result).toEqual({ ok: false, failure: 'weak-password' });
  });
});

describe('the session stream', () => {
  it('starts with nobody signed in', async () => {
    const session = await firstValueFrom(repository().onSessionChange());

    expect(session).toBeNull();
  });

  it('reports a sign-in', async () => {
    const auth = repository();
    const seen: Array<string | null> = [];
    auth.onSessionChange().subscribe((session) => seen.push(session?.member.username ?? null));

    await auth.signIn({ email: 'rexxar@example.test', password: 'beastmaster' });

    expect(seen).toEqual([null, 'rexxar']);
  });

  it('reports a sign-out', async () => {
    const auth = repository();
    await auth.signIn({ email: 'rexxar@example.test', password: 'beastmaster' });

    const seen: Array<string | null> = [];
    auth.onSessionChange().subscribe((session) => seen.push(session?.member.username ?? null));
    await auth.signOut();

    expect(seen).toEqual(['rexxar', null]);
  });

  it('does not report a failed sign-in', async () => {
    const auth = repository();
    const seen: Array<string | null> = [];
    auth.onSessionChange().subscribe((session) => seen.push(session?.member.username ?? null));

    await auth.signIn({ email: 'rexxar@example.test', password: 'wrong' });

    expect(seen).toEqual([null]);
  });
});

describe('persistence', () => {
  it('restores a session across a reload', async () => {
    await repository().signIn({ email: 'thrall@example.test', password: 'warchief' });

    // A fresh instance is what a page reload produces.
    const afterReload = await repository().currentSession();

    expect(afterReload?.member.username).toBe('thrall');
  });

  it('discards an expired session rather than rendering as signed in', async () => {
    localStorage.setItem(
      'trinity-nexus.session',
      JSON.stringify({
        member: { id: 'p-thrall', username: 'thrall', displayName: 'Thrall', role: 'admin' },
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    );

    // Otherwise the header shows an avatar and every write fails with no
    // explanation the member can act on.
    expect(await repository().currentSession()).toBeNull();
  });

  it('ignores a corrupted session instead of crashing on boot', async () => {
    localStorage.setItem('trinity-nexus.session', '{ not json');

    expect(await repository().currentSession()).toBeNull();
  });

  it('ignores a session with the wrong shape', async () => {
    localStorage.setItem('trinity-nexus.session', JSON.stringify({ hello: 'world' }));

    expect(await repository().currentSession()).toBeNull();
  });

  it('clears storage on sign-out', async () => {
    const auth = repository();
    await auth.signIn({ email: 'thrall@example.test', password: 'warchief' });

    await auth.signOut();

    expect(localStorage.getItem('trinity-nexus.session')).toBeNull();
  });
});
