/**
 * Theme vocabulary, kept in its own module so the provider, the hook and the
 * inline script in index.html all agree on the same three strings and the same
 * storage key. A mismatch there is invisible until the page flashes.
 */

/** What the user chose. `system` defers to the OS setting and keeps following it. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** What is actually painted. `system` has already been resolved. */
export type ResolvedTheme = 'light' | 'dark';

/** Must match the key read by the anti-flash script in index.html. */
export const THEME_STORAGE_KEY = 'trinity-nexus.theme';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && THEME_PREFERENCES.includes(value as ThemePreference);
}
