import { z } from 'zod';

/**
 * Environment configuration, validated once at module load.
 *
 * The alternative — reading `import.meta.env.X` wherever it is needed — fails
 * late and quietly: a missing Supabase URL becomes a network error on the
 * first login attempt rather than a clear message at startup. Validating here
 * turns a misconfigured deployment into an immediate, named failure.
 */

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value === 'true');

const schema = z
  .object({
    basePath: z.string().startsWith('/').default('/'),
    siteUrl: z.url().default('http://localhost:5173'),
    dataSource: z.enum(['memory', 'supabase']).default('memory'),
    supabaseUrl: z.union([z.url(), z.literal('')]).default(''),
    supabaseAnonKey: z.string().default(''),
    features: z.object({
      anonymousPosting: booleanFromString,
    }),
  })
  .refine(
    (value) =>
      value.dataSource !== 'supabase' || (value.supabaseUrl !== '' && value.supabaseAnonKey !== ''),
    {
      message:
        'VITE_DATA_SOURCE=supabase requires both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      path: ['supabaseUrl'],
    },
  );

export type Env = z.infer<typeof schema>;

function readEnv(): Env {
  const raw = {
    // `import.meta.env.BASE_URL` is what Vite actually resolved, which already
    // accounts for VITE_BASE_PATH. Reading the resolved value keeps the router
    // and the build from ever disagreeing about where the app is mounted.
    basePath: import.meta.env.BASE_URL,
    siteUrl: import.meta.env.VITE_SITE_URL,
    dataSource: import.meta.env.VITE_DATA_SOURCE,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    features: {
      anonymousPosting: import.meta.env.VITE_FEATURE_ANONYMOUS_POSTING,
    },
  };

  const result = schema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}

export const env: Env = readEnv();
