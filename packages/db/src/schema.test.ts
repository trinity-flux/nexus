import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDatabase, createUser } from './testing/createTestDatabase';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
});

describe('migrations', () => {
  it('apply cleanly from an empty database', async () => {
    const tables = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`,
    );

    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'categories',
      'games',
      'mentions',
      'moderation_actions',
      'notifications',
      'posts',
      'profiles',
      'reactions',
      'reports',
      'subscriptions',
      'tags',
      'topic_tags',
      'topics',
    ]);
  });

  it('enables row level security on every table', async () => {
    const unprotected = await db.query<{ tablename: string }>(
      `select tablename from pg_tables
       where schemaname = 'public' and rowsecurity = false`,
    );

    // A new table without RLS is readable and writable by anyone holding the
    // anon key, which ships in the browser bundle.
    expect(unprotected.rows.map((row) => row.tablename)).toEqual([]);
  });

  it('seeds the categories a new forum needs to be usable', async () => {
    const categories = await db.query<{ slug: string }>(
      'select slug from public.categories order by sort_order',
    );

    expect(categories.rows.map((row) => row.slug)).toContain('general');
    expect(categories.rows).toHaveLength(7);
  });

  it('locks the announcements board so a fresh database is never briefly open', async () => {
    const announcements = await db.query<{ is_locked: boolean }>(
      "select is_locked from public.categories where slug = 'announcements'",
    );

    expect(announcements.rows[0]?.is_locked).toBe(true);
  });
});

describe('profile creation', () => {
  it('creates a profile in the same transaction as the auth user', async () => {
    const user = await createUser(db, { username: 'thrall' });

    const profile = await db.query<{ username: string; role: string }>(
      'select username, role from public.profiles where id = $1',
      [user.id],
    );

    expect(profile.rows[0]).toMatchObject({ username: 'thrall', role: 'member' });
  });

  it('gives the second person with a name a distinct username', async () => {
    await createUser(db, { username: 'jaina' });
    const second = await createUser(db, { username: 'jaina' });

    expect(second.username).not.toBe('jaina');
    expect(second.username).toMatch(/^jaina\d+$/);
  });

  it('refuses two usernames that differ only in case', async () => {
    await createUser(db, { username: 'Sylvanas' });
    const impostor = await createUser(db, { username: 'arthas' });

    // Without the case-insensitive index, "Sylvanas" and "sylvanas" are two
    // accounts, which is an impersonation vector on a forum.
    await expect(
      db.query("update public.profiles set username = 'sylvanas' where id = $1", [impostor.id]),
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});
