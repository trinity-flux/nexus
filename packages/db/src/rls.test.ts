import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  asUser,
  createTestDatabase,
  createUser,
  type TestUser,
} from './testing/createTestDatabase';

/**
 * Row Level Security is the entire authorisation model of this product: the
 * anon key ships in the browser bundle, so these policies are what stand
 * between a stranger and the database.
 *
 * A wrong policy does not throw. It filters too little, and nothing looks
 * broken until data is somewhere it should not be — which is why every one of
 * them is asserted here rather than reviewed by eye.
 */

let db: PGlite;
let author: TestUser;
let bystander: TestUser;
let moderator: TestUser;
let generalCategoryId: string;
let topicId: string;
let openingPostId: string;

async function scalar<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const result = await db.query<Record<string, T>>(sql, params);
  const row = result.rows[0];
  return row ? Object.values(row)[0] : undefined;
}

beforeAll(async () => {
  db = await createTestDatabase();

  author = await createUser(db, { username: 'author' });
  bystander = await createUser(db, { username: 'bystander' });
  moderator = await createUser(db, { username: 'moderator', role: 'moderator' });

  generalCategoryId = (await scalar<string>(
    "select id from public.categories where slug = 'general'",
  )) as string;

  await asUser(db, author, async () => {
    const created = await db.query<{ id: string }>(
      'select id from public.create_topic($1, $2, $3)',
      [generalCategoryId, 'How do I get to Northrend?', 'Asking for a friend.'],
    );
    topicId = created.rows[0]?.id as string;
  });

  openingPostId = (await scalar<string>(
    'select id from public.posts where topic_id = $1 and is_opening_post',
    [topicId],
  )) as string;
});

describe('reading', () => {
  it('lets a signed-out visitor read the forum', async () => {
    const count = await asUser(db, null, () =>
      scalar<string>('select count(*) from public.topics where id = $1', [topicId]),
    );

    expect(Number(count)).toBe(1);
  });

  it('lets a signed-out visitor read profiles, since authorship is public', async () => {
    const count = await asUser(db, null, () =>
      scalar<string>('select count(*) from public.profiles'),
    );

    expect(Number(count)).toBeGreaterThan(0);
  });

  it('hides a deleted post from everyone but its author and moderators', async () => {
    const reply = await asUser(db, bystander, async () => {
      const inserted = await db.query<{ id: string }>(
        'insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3) returning id',
        [topicId, bystander.id, 'Take the boat from Menethil.'],
      );
      return inserted.rows[0]?.id as string;
    });

    await asUser(db, bystander, async () => {
      await db.query('update public.posts set deleted_at = now() where id = $1', [reply]);
    });

    const seenByStranger = await asUser(db, author, () =>
      scalar<string>('select count(*) from public.posts where id = $1', [reply]),
    );
    const seenByModerator = await asUser(db, moderator, () =>
      scalar<string>('select count(*) from public.posts where id = $1', [reply]),
    );

    expect(Number(seenByStranger)).toBe(0);
    expect(Number(seenByModerator)).toBe(1);
  });
});

describe('writing', () => {
  it('refuses a topic from a signed-out visitor in a normal category', async () => {
    await expect(
      asUser(db, null, () =>
        db.query('insert into public.topics (category_id, title, slug) values ($1, $2, $3)', [
          generalCategoryId,
          'Free gold here',
          'free-gold',
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('refuses a post attributed to somebody else', async () => {
    // The obvious attack: sign in as yourself, set author_id to a moderator.
    await expect(
      asUser(db, bystander, () =>
        db.query('insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3)', [
          topicId,
          moderator.id,
          'An official-looking announcement.',
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('refuses an edit to somebody else’s post', async () => {
    const before = await scalar<string>('select body_md from public.posts where id = $1', [
      openingPostId,
    ]);

    await asUser(db, bystander, () =>
      db.query('update public.posts set body_md = $1 where id = $2', ['Edited.', openingPostId]),
    );

    // No error: an UPDATE whose USING clause matches nothing is a no-op, not a
    // rejection. Only asserting the row is unchanged catches a policy that is
    // too permissive.
    const after = await scalar<string>('select body_md from public.posts where id = $1', [
      openingPostId,
    ]);
    expect(after).toBe(before);
  });

  it('silently changes nothing when a stranger updates a row they cannot see', async () => {
    // An UPDATE whose USING clause matches no row is not an error, it is a
    // no-op. Asserting the row is unchanged is the only way to catch a policy
    // that is too permissive here.
    const before = await scalar<string>('select title from public.topics where id = $1', [topicId]);

    await asUser(db, bystander, () =>
      db.query('update public.topics set title = $1 where id = $2', ['Hijacked', topicId]),
    );

    const after = await scalar<string>('select title from public.topics where id = $1', [topicId]);
    expect(after).toBe(before);
  });

  it('lets an author edit their own post', async () => {
    await asUser(db, author, () =>
      db.query('update public.posts set body_md = $1, edited_at = now() where id = $2', [
        'Asking for a friend. (edited)',
        openingPostId,
      ]),
    );

    const body = await scalar<string>('select body_md from public.posts where id = $1', [
      openingPostId,
    ]);
    expect(body).toContain('(edited)');
  });
});

describe('privilege escalation', () => {
  it('refuses a member promoting themselves to admin', async () => {
    await asUser(db, bystander, () =>
      db.query("update public.profiles set role = 'admin' where id = $1", [bystander.id]),
    );

    const role = await scalar<string>('select role from public.profiles where id = $1', [
      bystander.id,
    ]);
    expect(role).toBe('member');
  });

  it('refuses a member lifting their own ban', async () => {
    await db.query(
      "update public.profiles set banned_until = now() + interval '7 days' where id = $1",
      [bystander.id],
    );

    await asUser(db, bystander, () =>
      db.query('update public.profiles set banned_until = null where id = $1', [bystander.id]),
    );

    const banned = await scalar<Date>('select banned_until from public.profiles where id = $1', [
      bystander.id,
    ]);
    expect(banned).not.toBeNull();

    await db.query('update public.profiles set banned_until = null where id = $1', [bystander.id]);
  });

  it('refuses an author pinning their own topic to the top of a category', async () => {
    await asUser(db, author, () =>
      db.query('update public.topics set is_pinned = true where id = $1', [topicId]),
    );

    const pinned = await scalar<boolean>('select is_pinned from public.topics where id = $1', [
      topicId,
    ]);
    expect(pinned).toBe(false);
  });

  it('lets a moderator pin a topic', async () => {
    await asUser(db, moderator, () =>
      db.query('update public.topics set is_pinned = true where id = $1', [topicId]),
    );

    const pinned = await scalar<boolean>('select is_pinned from public.topics where id = $1', [
      topicId,
    ]);
    expect(pinned).toBe(true);

    await db.query('update public.topics set is_pinned = false where id = $1', [topicId]);
  });
});

describe('bans', () => {
  it('stops a banned member from posting without deleting their account', async () => {
    await db.query(
      "update public.profiles set banned_until = now() + interval '7 days' where id = $1",
      [bystander.id],
    );

    await expect(
      asUser(db, bystander, () =>
        db.query('insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3)', [
          topicId,
          bystander.id,
          'Still here.',
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);

    await db.query('update public.profiles set banned_until = null where id = $1', [bystander.id]);
  });
});

describe('locked topics', () => {
  it('refuses replies once a moderator locks the topic', async () => {
    await asUser(db, moderator, () =>
      db.query('update public.topics set is_locked = true where id = $1', [topicId]),
    );

    await expect(
      asUser(db, bystander, () =>
        db.query('insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3)', [
          topicId,
          bystander.id,
          'One more thing.',
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);

    await asUser(db, moderator, () =>
      db.query('update public.topics set is_locked = false where id = $1', [topicId]),
    );
  });
});

describe('private data', () => {
  it('keeps notifications to their recipient', async () => {
    await asUser(db, bystander, () =>
      db.query('insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3)', [
        topicId,
        bystander.id,
        'A reply that notifies the author.',
      ]),
    );

    const seenByAuthor = await asUser(db, author, () =>
      scalar<string>('select count(*) from public.notifications'),
    );
    const seenByStranger = await asUser(db, moderator, () =>
      scalar<string>('select count(*) from public.notifications'),
    );

    expect(Number(seenByAuthor)).toBeGreaterThan(0);
    // Even a moderator has no business reading someone else's notifications.
    expect(Number(seenByStranger)).toBe(0);
  });

  it('gives no client any way to write a notification', async () => {
    // There is deliberately no insert policy: notifications come from
    // SECURITY DEFINER triggers. A client that could insert could notify
    // anyone about anything, which is a spam channel with no post to report.
    await expect(
      asUser(db, bystander, () =>
        db.query("insert into public.notifications (recipient_id, kind) values ($1, 'mention')", [
          author.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('keeps subscriptions private', async () => {
    await asUser(db, author, () =>
      db.query('insert into public.subscriptions (profile_id, topic_id) values ($1, $2)', [
        author.id,
        topicId,
      ]),
    );

    const seenByOther = await asUser(db, bystander, () =>
      scalar<string>('select count(*) from public.subscriptions'),
    );

    expect(Number(seenByOther)).toBe(0);
  });

  it('keeps the moderation log out of reach of members', async () => {
    await asUser(db, moderator, () =>
      db.query(
        "insert into public.moderation_actions (moderator_id, kind, topic_id) values ($1, 'lock_topic', $2)",
        [moderator.id, topicId],
      ),
    );

    const seenByMember = await asUser(db, bystander, () =>
      scalar<string>('select count(*) from public.moderation_actions'),
    );
    const seenByModerator = await asUser(db, moderator, () =>
      scalar<string>('select count(*) from public.moderation_actions'),
    );

    expect(Number(seenByMember)).toBe(0);
    expect(Number(seenByModerator)).toBeGreaterThan(0);
  });
});

describe('mentions', () => {
  it('refuses a mention recorded by anyone but the post author', async () => {
    // Otherwise anyone could insert a mention row and make the notification
    // trigger fire at a stranger, with no post attached to report.
    await expect(
      asUser(db, bystander, () =>
        db.query('insert into public.mentions (post_id, profile_id) values ($1, $2)', [
          openingPostId,
          moderator.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
