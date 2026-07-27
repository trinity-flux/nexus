/**
 * The languages the interface is available in.
 *
 * The same three as trinity-admin, so a member moving between the panel and
 * the forum is never dropped back into English.
 */
export const LOCALES = ['en', 'es', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Falls back to English rather than to the first match, because English is the
 * only locale guaranteed to have every key. See `translations.ts`.
 */
export const FALLBACK_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'trinity-nexus.locale';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale);
}

/**
 * Picks the best available locale from what the browser asks for.
 *
 * `navigator.languages` is ordered by preference and its entries carry region
 * tags — "es-CO", "en-GB" — so only the primary subtag is compared.
 */
export function negotiateLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const primary = tag.split('-')[0]?.toLowerCase();
    if (isLocale(primary)) {
      return primary;
    }
  }
  return FALLBACK_LOCALE;
}
