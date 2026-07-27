import { createContext } from 'react';

import type { Locale } from './locales';
import type { TranslationValues } from './translate';
import type { TranslationKey } from './translations';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Resolves a key in the active locale. Shortened to `t` at every call site. */
  t: (key: TranslationKey, values?: TranslationValues) => string;
  /** Relative time in the active locale: "2 hours ago", "hace 2 horas". */
  formatRelativeTime: (value: Date | string) => string;
  formatDate: (value: Date | string) => string;
  formatNumber: (value: number) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
