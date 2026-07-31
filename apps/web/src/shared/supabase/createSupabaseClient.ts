import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '../config/env';

/**
 * The one place `@supabase/supabase-js` is constructed.
 *
 * Every adapter receives this client rather than importing the SDK itself,
 * which is what keeps "replace Supabase" a change inside `infrastructure/`
 * instead of a search across the codebase. It is also why the type is not
 * re-exported: nothing above this layer should be able to name it.
 *
 * A single instance, created once. Two clients means two websocket
 * connections, two token refresh timers, and two answers to the question of
 * who is signed in.
 */
let client: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    // `env.ts` already refuses to start without these when the data source is
    // supabase. This is the second line of defence, and it names the variable
    // rather than letting the SDK fail later with a URL parse error.
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required when VITE_DATA_SOURCE=supabase.',
    );
  }

  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      // The session outlives the tab, and the token is refreshed before it
      // expires rather than after a request has already failed with a 401.
      persistSession: true,
      autoRefreshToken: true,
      // Discord sends the member back with the tokens in the URL fragment.
      // Without this they are never read and the redirect lands on a page that
      // still believes nobody is signed in.
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    realtime: {
      // Ten messages a second is far above what a forum thread produces, and
      // low enough that a misbehaving subscription cannot saturate the tab.
      params: { eventsPerSecond: 10 },
    },
  });

  return client;
}
