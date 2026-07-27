import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', '..', 'supabase', 'migrations');

/**
 * Boots an in-memory Postgres and applies every migration in order.
 *
 * The point is that these are the *real* migration files, not a summary of
 * them. A policy that is wrong in the file is wrong in the test, which is the
 * only way a Row Level Security suite is worth running — and PGlite means it
 * runs in CI in a second, with no Docker and no cloud project.
 */
export async function createTestDatabase(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pg_trgm } });

  await db.exec(readFileSync(join(here, 'authSchemaStub.sql'), 'utf8'));

  const migrations = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const migration of migrations) {
    const sql = readFileSync(join(migrationsDir, migration), 'utf8');
    try {
      await db.exec(sql);
    } catch (cause) {
      throw new Error(`Migration ${migration} failed: ${(cause as Error).message}`, { cause });
    }
  }

  return db;
}

export interface TestUser {
  id: string;
  username: string;
}

/**
 * Creates an auth user, which the `on_auth_user_created` trigger turns into a
 * profile. Going through the trigger rather than inserting a profile directly
 * means the tests exercise the same path a real sign-up takes.
 */
export async function createUser(
  db: PGlite,
  options: { username: string; role?: 'member' | 'moderator' | 'admin' },
): Promise<TestUser> {
  // The email is made unique per call rather than derived from the username,
  // because two people signing up with the same Discord name is exactly the
  // collision these tests need to be able to set up.
  const inserted = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data)
     values ($1, jsonb_build_object('user_name', $2::text))
     returning id`,
    [`${options.username}-${crypto.randomUUID()}@example.test`, options.username],
  );

  const id = inserted.rows[0]?.id;
  if (!id) {
    throw new Error(`Failed to create auth user ${options.username}`);
  }

  if (options.role && options.role !== 'member') {
    await db.query('update public.profiles set role = $1 where id = $2', [options.role, id]);
  }

  const profile = await db.query<{ username: string }>(
    'select username from public.profiles where id = $1',
    [id],
  );

  const username = profile.rows[0]?.username;
  if (!username) {
    throw new Error(`No profile was created for ${options.username}`);
  }

  return { id, username };
}

/**
 * Runs a callback as a given user, with RLS enforced.
 *
 * Everything happens inside one transaction so `set local` is scoped and the
 * session role is always restored, even when the callback throws — otherwise
 * one failing assertion leaves every later test running as the wrong user.
 */
export async function asUser<T>(
  db: PGlite,
  user: TestUser | null,
  run: () => Promise<T>,
): Promise<T> {
  await db.exec('begin');
  try {
    if (user) {
      await db.query('select set_config($1, $2, true)', ['request.jwt.claim.sub', user.id]);
      await db.query('select set_config($1, $2, true)', [
        'request.jwt.claim.role',
        'authenticated',
      ]);
      await db.exec('set local role authenticated');
    } else {
      await db.query('select set_config($1, $2, true)', ['request.jwt.claim.role', 'anon']);
      await db.exec('set local role anon');
    }

    const result = await run();
    await db.exec('commit');
    return result;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}
