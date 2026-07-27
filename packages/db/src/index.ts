/**
 * Public surface of the database package.
 *
 * Only types cross this boundary. The SQL lives in `supabase/migrations/` and
 * is applied by the Supabase CLI, never imported at runtime.
 */
export * from './schema';
