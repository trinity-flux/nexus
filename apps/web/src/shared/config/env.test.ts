import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `env.ts` validates at module load, so each case re-imports the module with a
 * different environment. That is the behaviour under test: a misconfigured
 * deployment must fail at startup with a named error, not later with a
 * confusing network failure.
 */
async function loadEnv() {
  vi.resetModules();
  return import('./env');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('env', () => {
  it('defaults to the in-memory data source so a fresh clone runs with no backend', async () => {
    const { env } = await loadEnv();

    expect(env.dataSource).toBe('memory');
  });

  it('reads the base path Vite resolved, not the raw variable', async () => {
    vi.stubEnv('BASE_URL', '/trinitynexus.github.io/');

    const { env } = await loadEnv();

    expect(env.basePath).toBe('/trinitynexus.github.io/');
  });

  it('turns feature flags into booleans', async () => {
    vi.stubEnv('VITE_FEATURE_ANONYMOUS_POSTING', 'true');

    const { env } = await loadEnv();

    expect(env.features.anonymousPosting).toBe(true);
  });

  it('treats anything other than "true" as off, so a typo cannot enable a flag', async () => {
    vi.stubEnv('VITE_FEATURE_ANONYMOUS_POSTING', 'TRUE');

    const { env } = await loadEnv();

    expect(env.features.anonymousPosting).toBe(false);
  });

  it('rejects the supabase data source when credentials are missing', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(loadEnv()).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('accepts the supabase data source once both credentials are present', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const { env } = await loadEnv();

    expect(env.dataSource).toBe('supabase');
    expect(env.supabaseUrl).toBe('https://example.supabase.co');
  });

  it('rejects an unknown data source rather than silently falling back', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'firebase');

    await expect(loadEnv()).rejects.toThrow(/dataSource/);
  });
});
