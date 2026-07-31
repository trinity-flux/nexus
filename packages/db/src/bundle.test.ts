import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { beforeAll, describe, expect, it } from 'vitest';

import { SCHEMA_CONTRACT } from './schema';

/**
 * The bundled schema has to produce the same database as the migrations.
 *
 * It is what someone pastes into the Supabase SQL editor to create a project,
 * so a defect here is a broken production database rather than a failed test.
 * The two ways concatenation goes wrong are both silent: a file that does not
 * end in a statement terminator swallows the first statement of the next one,
 * and a statement that cannot run inside a transaction aborts the whole
 * bundle where it succeeded file by file.
 *
 * Regenerated here rather than read from a committed artefact, so the test
 * cannot pass against a stale bundle.
 */

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..');

describe('the bundled schema', () => {
  let db: PGlite;

  beforeAll(async () => {
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', join(packageRoot, 'scripts', 'bundleMigrations.ts')],
      { cwd: packageRoot, stdio: 'pipe' },
    );

    const bundle = readFileSync(join(packageRoot, 'dist', 'schema.sql'), 'utf8');

    db = await PGlite.create({ extensions: { pg_trgm } });
    await db.exec(readFileSync(join(here, 'testing', 'authSchemaStub.sql'), 'utf8'));
    await db.exec(bundle);
  }, 60_000);

  it('creates every table the application expects', async () => {
    const result = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const created = new Set(result.rows.map((row) => row.table_name));

    for (const table of Object.keys(SCHEMA_CONTRACT)) {
      expect(created, `${table} is missing from the bundle`).toContain(table);
    }
  });

  it('leaves row level security on for every table', async () => {
    // The bundle exists to create production databases. A table that arrives
    // with RLS off is readable and writable by anyone holding the anon key,
    // which is published in the client bundle by design.
    const result = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
    );

    const unprotected = result.rows.filter((row) => !row.rowsecurity).map((row) => row.tablename);

    expect(unprotected).toEqual([]);
  });

  it('carries the seeded reference data, so a new project is not empty', async () => {
    const games = await db.query<{ count: number }>(
      'select count(*)::int as count from public.games',
    );
    const categories = await db.query<{ count: number }>(
      'select count(*)::int as count from public.categories',
    );

    expect(games.rows[0]?.count).toBeGreaterThan(0);
    expect(categories.rows[0]?.count).toBeGreaterThan(0);
  });

  it('installs the trigger that creates a profile for a new account', async () => {
    // Without it, signing up produces an auth user with no profile, and every
    // page that joins against `profiles` shows a member who does not exist.
    const result = await db.query<{ tgname: string }>(
      "select tgname from pg_trigger where tgname = 'on_auth_user_created'",
    );

    expect(result.rows).toHaveLength(1);
  });
});
