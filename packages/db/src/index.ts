/**
 * Public surface of the database package.
 *
 * Only types cross this boundary. The SQL lives in `supabase/migrations/` and
 * is applied by the Supabase CLI, never imported at runtime.
 *
 * `src/generated/database.types.ts` is produced from that schema by
 * `pnpm --filter @trinity-nexus/db db:types` and re-exported from here once
 * the first migration exists. Generating it is what keeps the TypeScript view
 * of a table honest about the table.
 */

/** Bumped by hand when a migration changes the shape of the public schema. */
export const SCHEMA_VERSION = 0;
