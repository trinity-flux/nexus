import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Concatenates every migration into one file for Supabase's SQL editor.
 *
 * `supabase db push` is the right way to apply these, and the reason this
 * exists anyway is that pushing needs the project linked and an access token,
 * which is more setup than someone bringing a project up for the first time
 * wants. Pasting one file into the dashboard needs neither.
 *
 * Generated on demand and not committed. A second copy of the schema in the
 * repository is a copy that drifts, and the failure mode — a project created
 * from a stale bundle — is silent until something written against the newer
 * schema fails.
 *
 * Order is the filename order, which is why migrations are named with a
 * timestamp. It is not cosmetic: policies reference tables, triggers reference
 * functions, and the seed rows reference both.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'supabase', 'migrations');
const outputPath = join(here, '..', 'dist', 'schema.sql');

async function bundleMigrations(): Promise<void> {
  const fileNames = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();

  if (fileNames.length === 0) {
    throw new Error(`No migrations found in ${migrationsDir}`);
  }

  const parts: string[] = [
    '-- Trinity Nexus: the complete schema, bundled from the migrations.',
    '--',
    '-- GENERATED FILE. Edit the migrations under supabase/migrations/ and run',
    '-- `pnpm --filter @trinity-nexus/db run db:bundle` again.',
    '--',
    '-- Apply by pasting into the Supabase SQL editor and running it once, on a',
    '-- project with no tables in `public`. Applying it twice will fail on the',
    '-- first `create table`, which is the intended behaviour: re-running a',
    '-- schema against a database that already has data is not something to do',
    '-- by accident.',
    `--\n-- Source migrations, in order:\n${fileNames.map((name) => `--   ${name}`).join('\n')}`,
    '',
    'begin;',
    '',
  ];

  for (const fileName of fileNames) {
    const sql = await readFile(join(migrationsDir, fileName), 'utf8');
    parts.push(
      `-- ===========================================================================`,
      `-- ${fileName}`,
      `-- ===========================================================================`,
      '',
      sql.trimEnd(),
      '',
    );
  }

  // One transaction for the whole bundle: a half-applied schema is worse than
  // no schema, because the next attempt fails on the tables that did land and
  // the person applying it has to work out which half is missing.
  parts.push('commit;', '');

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, parts.join('\n'), 'utf8');

  console.log(`Bundled ${fileNames.length} migrations into ${outputPath}`);
}

await bundleMigrations();
