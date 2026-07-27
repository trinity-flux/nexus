import { FALLBACK_LOCALE, type Locale } from './locales';
import { TRANSLATIONS, type TranslationKey } from './translations';

export type TranslationValues = Record<string, string | number>;

/**
 * Cached because constructing an `Intl` formatter is expensive and these are
 * hit on every rendered count.
 */
const pluralRules = new Map<Locale, Intl.PluralRules>();
const numberFormats = new Map<Locale, Intl.NumberFormat>();

function pluralRulesFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

function numberFormatFor(locale: Locale): Intl.NumberFormat {
  let format = numberFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale);
    numberFormats.set(locale, format);
  }
  return format;
}

/**
 * Resolves a key in one locale, substituting `{placeholders}`.
 *
 * Two things happen automatically because getting them wrong is invisible to
 * whoever wrote the string:
 *
 * **Plurals.** When `values.count` is a number, a `key_one` / `key_few` /
 * `key_many` variant is preferred over the base key, chosen by
 * `Intl.PluralRules` for that locale. The base key is the "other" form. This
 * is not decoration: without it every count reads "1 topics", and the rules
 * differ per language — Spanish needs two forms, French three, and Polish
 * four, which no amount of English intuition would produce.
 *
 * **Number formatting.** Numeric values are formatted for the locale, so a
 * thousand is "1,000" in English and "1.000" in Spanish. Doing it here rather
 * than at the call site is also what keeps `count` a number long enough for
 * the plural rules to see it.
 */
export function translate(locale: Locale, key: TranslationKey, values?: TranslationValues): string {
  const template = resolveTemplate(locale, key, values);

  if (!values) {
    return template;
  }

  const numbers = numberFormatFor(locale);

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    if (value === undefined) {
      return match;
    }
    return typeof value === 'number' ? numbers.format(value) : value;
  });
}

function resolveTemplate(
  locale: Locale,
  key: TranslationKey,
  values: TranslationValues | undefined,
): string {
  const table = TRANSLATIONS[locale];
  const fallback = TRANSLATIONS[FALLBACK_LOCALE];

  const count = values?.['count'];
  if (typeof count === 'number') {
    const category = pluralRulesFor(locale).select(count);
    if (category !== 'other') {
      const variant = `${key}_${category}` as TranslationKey;
      const localised = table[variant] as string | undefined;
      if (localised) {
        return localised;
      }
      const englishVariant = fallback[variant] as string | undefined;
      if (englishVariant) {
        return englishVariant;
      }
    }
  }

  // Missing keys fall back to English rather than rendering the key itself: a
  // visitor seeing `topics.replyCount` is worse than seeing English.
  return table[key] || fallback[key];
}
