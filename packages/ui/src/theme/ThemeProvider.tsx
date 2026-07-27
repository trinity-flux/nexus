import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  isThemePreference,
  type ResolvedTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from './theme';
import { ThemeContext, type ThemeContextValue } from './themeContext';

const DARK_CLASS = 'dark';

/**
 * Reads the stored preference without throwing.
 *
 * Safari in private mode and hardened browser profiles make `localStorage`
 * access throw rather than return null, so every read and write here is
 * guarded. Falling back to `system` is the right answer in that case anyway.
 */
function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function prefersDark(): boolean {
  return !window.matchMedia('(prefers-color-scheme: light)').matches;
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') {
    return preference;
  }
  return prefersDark() ? 'dark' : 'light';
}

/**
 * Applies the theme to the document element.
 *
 * `color-scheme` is set alongside the class because it is what tells the
 * browser to render form controls, scrollbars and the canvas behind the page
 * in the matching shade. Without it a dark page still gets white scrollbars.
 */
function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle(DARK_CLASS, resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialised from storage rather than from a default, so the first render
  // already matches what the inline script in index.html painted. Any other
  // starting value produces a visible flip on hydration.
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readStoredPreference()));

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(resolve(next));

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Preference is lost on reload but the session still works. */
    }
  }, []);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (preference !== 'system') {
      return;
    }

    // Only while following the system does the OS switch matter. Someone who
    // explicitly chose dark should stay dark when their machine turns light at
    // sunrise.
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      setResolved(prefersDark() ? 'dark' : 'light');
    };

    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
    };
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
