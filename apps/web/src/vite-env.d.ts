/// <reference types="vite/client" />

/**
 * Declared here so a typo in `import.meta.env.VITE_SUPBASE_URL` is a type
 * error rather than an `undefined` that only surfaces in production.
 * The runtime values are validated separately in `shared/config/env.ts`.
 */
interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FEATURE_ANONYMOUS_POSTING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
