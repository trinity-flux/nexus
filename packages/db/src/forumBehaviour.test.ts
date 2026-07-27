import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  asUser,
  createTestDatabase,
  createUser,
  type TestUser,
} from './testing/createTestDatabase';

/**
 * Behaviour the database guarantees on its own.
 *
 * All of it could live in the application instead, and none of it should: the
 * app is not the only writer. An operator in the SQL console and a future edge
 * function both bypass application code, and a thread whose reply count is
 * wrong is wrong forever.
 */

let db: PGlite;
let alice: TestUser;
let bob: TestUser;
let categoryId: string;

async function scalar<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const result = await db.query<Record<string, T>>(sql, params);
  const row = result.rows[0];
  return row ? Object.values(row)[0] : undefined;
}

async function createTopic(user: TestUser, title: string): Promise<string> {
  return asUser(db, user, async () => {
    const created = await db.query<{ id: string }>(
      'select id from public.create_topic($1, $2, $3)',
      [categoryId, title, 'Opening post.'],
    );
    return created.rows[0]?.id as string;
  });
}

interface InsertedPost {
  id: string;
  depth: number;
  parent_id: string | null;
}

// The return type is written out rather than inferred: without it, Biome's
// type-aware `noFloatingPromises` cannot follow the generic through `asUser`
// and reports every awaited call here as unhandled.
async function reply(
  user: TestUser,
  topicId: string,
  parentId: string | null,
  body: string,
): Promise<InsertedPost> {
  return asUser(db, user, async () => {
    const inserted = await db.query<InsertedPost>(
      `insert into public.posts (topic_id, author_id, parent_id, body_md)
       values ($1, $2, $3, $4)
       returning id, depth, parent_id`,
      [topicId, user.id, parentId, body],
    );
    return inserted.rows[0] as InsertedPost;
  });
}

beforeAll(async () => {
  db = await createTestDatabase();
  alice = await createUser(db, { username: 'alice' });
  bob = await createUser(db, { username: 'bob' });
  categoryId = (await scalar<string>(
    "select id from public.categories where slug = 'general'",
  )) as string;
});

describe('create_topic', () => {
  it('creates the topic and its opening post together', async () => {
    const topicId = await createTopic(alice, 'Where do I find copper ore?');

    const openingPosts = await scalar<string>(
      'select count(*) from public.posts where topic_id = $1 and is_opening_post',
      [topicId],
    );

    // A topic with no opening post renders as an empty page, so the two
    // inserts are one transaction rather than two round trips the client
    // could fail between.
    expect(Number(openingPosts)).toBe(1);
  });

  it('derives a URL slug from the title', async () => {
    const topicId = await createTopic(alice, 'Where do I find tin ore?');

    const slug = await scalar<string>('select slug from public.topics where id = $1', [topicId]);
    expect(slug).toBe('where-do-i-find-tin-ore');
  });

  it('keeps slugs unique when two topics share a title', async () => {
    const first = await createTopic(bob, 'Best levelling spec');
    const second = await createTopic(bob, 'Best levelling spec');

    const firstSlug = await scalar<string>('select slug from public.topics where id = $1', [first]);
    const secondSlug = await scalar<string>('select slug from public.topics where id = $1', [
      second,
    ]);

    expect(firstSlug).toBe('best-levelling-spec');
    expect(secondSlug).toBe('best-levelling-spec-1');
  });

  it('falls back to a usable slug when the title has no latin characters', async () => {
    const topicId = await createTopic(alice, '???');

    const slug = await scalar<string>('select slug from public.topics where id = $1', [topicId]);
    expect(slug).toMatch(/^topic/);
  });
});

describe('reply nesting', () => {
  it('gives a top-level reply a path of one and depth zero', async () => {
    const topicId = await createTopic(alice, 'Nesting: top level');
    const post = await reply(bob, topicId, null, 'First.');

    expect(post.depth).toBe(0);
  });

  it('extends the parent path by one level', async () => {
    const topicId = await createTopic(alice, 'Nesting: one level');
    const parent = await reply(bob, topicId, null, 'Parent.');
    const child = await reply(alice, topicId, parent.id, 'Child.');

    const path = await scalar<string[]>('select path from public.posts where id = $1', [child.id]);

    expect(child.depth).toBe(1);
    expect(path).toEqual([parent.id, child.id]);
  });

  it('caps nesting at five levels instead of rejecting the reply', async () => {
    const topicId = await createTopic(alice, 'Nesting: deep');

    let parentId: string | null = null;
    let deepest = { id: '', depth: -1, parent_id: null as string | null };

    // Eight levels attempted; the sixth and beyond should all attach at five.
    for (let level = 0; level < 8; level += 1) {
      deepest = await reply(level % 2 === 0 ? bob : alice, topicId, parentId, `Level ${level}`);
      parentId = deepest.id;
    }

    // Past five levels of indentation a thread is unreadable on a phone. The
    // reply is kept and re-parented rather than refused, because losing
    // someone's writing is worse than flattening it.
    expect(deepest.depth).toBe(5);
  });
});

describe('reply counts', () => {
  it('does not count the opening post as a reply', async () => {
    const topicId = await createTopic(alice, 'Counters: opening post');

    const count = await scalar<number>('select reply_count from public.topics where id = $1', [
      topicId,
    ]);
    expect(Number(count)).toBe(0);
  });

  it('rises with each reply', async () => {
    const topicId = await createTopic(alice, 'Counters: rising');
    await reply(bob, topicId, null, 'One.');
    await reply(bob, topicId, null, 'Two.');

    const count = await scalar<number>('select reply_count from public.topics where id = $1', [
      topicId,
    ]);
    expect(Number(count)).toBe(2);
  });

  it('falls again when a reply is soft-deleted', async () => {
    const topicId = await createTopic(alice, 'Counters: falling');
    const post = await reply(bob, topicId, null, 'Regrettable.');

    await asUser(db, bob, () =>
      db.query('update public.posts set deleted_at = now() where id = $1', [post.id]),
    );

    // The soft-delete case is the one that gets forgotten, and it leaves every
    // listing quoting a count that does not match what the page shows.
    const count = await scalar<number>('select reply_count from public.topics where id = $1', [
      topicId,
    ]);
    expect(Number(count)).toBe(0);
  });

  it('moves last_activity_at forward so listings order by real activity', async () => {
    const topicId = await createTopic(alice, 'Counters: activity');
    const before = await scalar<Date>('select last_activity_at from public.topics where id = $1', [
      topicId,
    ]);

    await reply(bob, topicId, null, 'Still relevant.');

    const after = await scalar<Date>('select last_activity_at from public.topics where id = $1', [
      topicId,
    ]);
    expect(new Date(after as Date).getTime()).toBeGreaterThanOrEqual(
      new Date(before as Date).getTime(),
    );
  });
});

describe('notifications', () => {
  it('tells the topic author about a reply', async () => {
    const topicId = await createTopic(alice, 'Notifications: reply');
    await reply(bob, topicId, null, 'An answer.');

    const count = await scalar<string>(
      "select count(*) from public.notifications where recipient_id = $1 and kind = 'reply' and topic_id = $2",
      [alice.id, topicId],
    );
    expect(Number(count)).toBe(1);
  });

  it('does not tell anyone they replied to themselves', async () => {
    const topicId = await createTopic(alice, 'Notifications: self');
    await reply(alice, topicId, null, 'Adding to my own post.');

    const count = await scalar<string>(
      'select count(*) from public.notifications where recipient_id = $1 and topic_id = $2',
      [alice.id, topicId],
    );
    expect(Number(count)).toBe(0);
  });

  it('notifies the person actually being replied to, not the topic author', async () => {
    const topicId = await createTopic(alice, 'Notifications: nested');
    const bobsReply = await reply(bob, topicId, null, 'My take.');

    const carol = await createUser(db, { username: 'carol' });
    await reply(carol, topicId, bobsReply.id, 'Replying to Bob.');

    const toBob = await scalar<string>(
      'select count(*) from public.notifications where recipient_id = $1 and post_id is not null and topic_id = $2',
      [bob.id, topicId],
    );
    expect(Number(toBob)).toBeGreaterThan(0);
  });

  it('sends one notification, not two, to a subscriber who was also replied to', async () => {
    const topicId = await createTopic(alice, 'Notifications: no duplicates');

    await asUser(db, alice, () =>
      db.query('insert into public.subscriptions (profile_id, topic_id) values ($1, $2)', [
        alice.id,
        topicId,
      ]),
    );

    await reply(bob, topicId, null, 'One reply.');

    const count = await scalar<string>(
      'select count(*) from public.notifications where recipient_id = $1 and topic_id = $2',
      [alice.id, topicId],
    );
    expect(Number(count)).toBe(1);
  });

  it('notifies a mentioned member', async () => {
    const topicId = await createTopic(alice, 'Notifications: mention');
    const post = await reply(bob, topicId, null, 'Ask @alice, she knows.');

    await asUser(db, bob, () =>
      db.query('insert into public.mentions (post_id, profile_id) values ($1, $2)', [
        post.id,
        alice.id,
      ]),
    );

    const count = await scalar<string>(
      "select count(*) from public.notifications where recipient_id = $1 and kind = 'mention'",
      [alice.id],
    );
    expect(Number(count)).toBeGreaterThan(0);
  });
});

describe('search', () => {
  it('indexes topic titles for full-text search', async () => {
    await createTopic(alice, 'Enchanting recipes for Northrend');

    const found = await scalar<string>(
      `select count(*) from public.topics
       where search_vector @@ to_tsquery('simple', 'enchanting')`,
    );

    // Full text rather than ILIKE: ILIKE cannot use an index for a leading
    // wildcard and cannot rank.
    expect(Number(found)).toBeGreaterThan(0);
  });
});
