/**
 * Destinations that live outside the application.
 *
 * Collected here rather than written into the components that link to them, so
 * that a moved repository or a new community server is one edit instead of a
 * search across the codebase for a hard-coded URL.
 */
export const EXTERNAL_LINKS = {
  repository: 'https://github.com/trinity-flux/trinitynexus.github.io',
} as const;
