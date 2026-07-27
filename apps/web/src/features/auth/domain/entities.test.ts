import { describe, expect, it } from 'vitest';

import { asMemberId, type CurrentMember, canPost, isModerator } from './entities';

function member(overrides: Partial<CurrentMember> = {}): CurrentMember {
  return {
    id: asMemberId('p-1'),
    username: 'rexxar',
    displayName: 'Rexxar',
    avatarUrl: null,
    role: 'member',
    bannedUntil: null,
    ...overrides,
  };
}

describe('canPost', () => {
  it('is false for a signed-out visitor', () => {
    expect(canPost(null)).toBe(false);
  });

  it('is true for an ordinary member', () => {
    expect(canPost(member())).toBe(true);
  });

  it('is false while a ban is in force', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

    expect(canPost(member({ bannedUntil: tomorrow }))).toBe(false);
  });

  it('is true again once the ban has expired', () => {
    // A suspension is temporary by design; nothing has to run to lift it, and
    // nothing should have to.
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();

    expect(canPost(member({ bannedUntil: yesterday }))).toBe(true);
  });

  it('does not treat an admin as exempt from a ban', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

    expect(canPost(member({ role: 'admin', bannedUntil: tomorrow }))).toBe(false);
  });
});

describe('isModerator', () => {
  it('is false for a signed-out visitor', () => {
    expect(isModerator(null)).toBe(false);
  });

  it('is false for an ordinary member', () => {
    expect(isModerator(member())).toBe(false);
  });

  it('is true for a moderator and for an admin', () => {
    expect(isModerator(member({ role: 'moderator' }))).toBe(true);
    expect(isModerator(member({ role: 'admin' }))).toBe(true);
  });
});
