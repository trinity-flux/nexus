import { createContext } from 'react';

import type { ResolvedTheme, ThemePreference } from './theme';

export interface ThemeContextValue {
  /** What the user picked, including `system`. */
  preference: ThemePreference;
  /** What is on screen right now, with `system` already resolved. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Split from the provider file so that editing the provider does not
 * invalidate every consumer during hot reload, and so the hook can import the
 * context without pulling the provider's component into its module graph.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
