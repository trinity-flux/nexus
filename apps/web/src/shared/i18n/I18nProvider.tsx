import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { I18nContext, type I18nContextValue } from './i18nContext';
import { isLocale, LOCALE_STORAGE_KEY, type Locale, negotiateLocale } from './locales';
import { type TranslationValues, translate } from './translate';
import type { TranslationKey } from './translations';

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    /* Private-mode browsers throw on localStorage; negotiate instead. */
  }

  return negotiateLocale(navigator.languages ?? [navigator.language]);
}

export interface I18nProviderProps {
  children: ReactNode;
  /** Overrides detection. Used by tests and by the prerender step. */
  locale?: Locale;
}

export function I18nProvider({ children, locale: forcedLocale }: I18nProviderProps) {
  const [detected, setDetected] = useState<Locale>(readStoredLocale);
  const locale = forcedLocale ?? detected;

  const setLocale = useCallback((next: Locale) => {
    setDetected(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* Preference is lost on reload, but the session still works. */
    }
  }, []);

  // Assistive technology uses this to choose a voice, and the browser uses it
  // for hyphenation and spellchecking. Leaving it stale is a real defect for a
  // screen-reader user, not a cosmetic one.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    // Intl formatters are expensive to construct and are created once per
    // locale change rather than once per render.
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const dates = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    const numbers = new Intl.NumberFormat(locale);

    return {
      locale,
      setLocale,
      t: (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values),

      formatRelativeTime: (input: Date | string) => {
        const then = typeof input === 'string' ? new Date(input) : input;
        const seconds = (then.getTime() - Date.now()) / 1000;

        // Chosen so the largest unit that still gives a number above one wins:
        // "2 hours ago" rather than "120 minutes ago".
        const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
          ['year', 60 * 60 * 24 * 365],
          ['month', 60 * 60 * 24 * 30],
          ['week', 60 * 60 * 24 * 7],
          ['day', 60 * 60 * 24],
          ['hour', 60 * 60],
          ['minute', 60],
        ];

        for (const [unit, secondsPerUnit] of units) {
          if (Math.abs(seconds) >= secondsPerUnit) {
            return relative.format(Math.round(seconds / secondsPerUnit), unit);
          }
        }

        return relative.format(Math.round(seconds), 'second');
      },

      formatDate: (input: Date | string) =>
        dates.format(typeof input === 'string' ? new Date(input) : input),
      formatNumber: (input: number) => numbers.format(input),
    };
  }, [locale, setLocale]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
