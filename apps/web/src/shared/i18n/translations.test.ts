import { describe, expect, it } from 'vitest';

import { LOCALES } from './locales';
import { translate } from './translate';
import { TRANSLATIONS, type TranslationKey } from './translations';

const englishKeys = Object.keys(TRANSLATIONS.en) as TranslationKey[];

describe('translations', () => {
  it.each(LOCALES)('%s has every key English has', (locale) => {
    const missing = englishKeys.filter((key) => !(key in TRANSLATIONS[locale]));

    // The type system already enforces this, so a failure here means someone
    // widened a type to get past the compiler.
    expect(missing).toEqual([]);
  });

  it.each(LOCALES)('%s has no keys English does not', (locale) => {
    const extra = Object.keys(TRANSLATIONS[locale]).filter(
      (key) => !englishKeys.includes(key as TranslationKey),
    );

    expect(extra).toEqual([]);
  });

  it.each(LOCALES)('%s leaves no string empty', (locale) => {
    const blank = englishKeys.filter((key) => TRANSLATIONS[locale][key].trim() === '');

    expect(blank).toEqual([]);
  });

  it.each(LOCALES)('%s keeps every placeholder the English string declares', (locale) => {
    const placeholders = (value: string) => (value.match(/\{(\w+)\}/g) ?? []).sort();

    const mismatched = englishKeys
      .map((key) => ({
        key,
        english: placeholders(TRANSLATIONS.en[key]),
        translated: placeholders(TRANSLATIONS[locale][key]),
      }))
      .filter((entry) => entry.english.join(',') !== entry.translated.join(','));

    // A dropped `{count}` renders as a sentence with a hole in it, and only in
    // the language nobody on the team reads.
    expect(mismatched).toEqual([]);
  });
});

describe('plurals', () => {
  it('uses the singular form for one', () => {
    // "1 topics" is the single most common i18n defect there is, and it is
    // invisible to anyone testing with sample data that happens to have two.
    expect(translate('en', 'categories.topicCount', { count: 1 })).toBe('1 topic');
    expect(translate('es', 'categories.topicCount', { count: 1 })).toBe('1 tema');
    expect(translate('fr', 'categories.topicCount', { count: 1 })).toBe('1 sujet');
  });

  it('uses the plural form for anything else', () => {
    expect(translate('en', 'categories.topicCount', { count: 0 })).toBe('0 topics');
    expect(translate('en', 'categories.topicCount', { count: 7 })).toBe('7 topics');
    expect(translate('es', 'categories.topicCount', { count: 7 })).toBe('7 temas');
  });

  it('agrees with Intl about which locales count one as singular', () => {
    // French treats 0 as singular, English and Spanish do not. Hardcoding
    // `count === 1` would be wrong here and nobody on the team would notice.
    expect(translate('fr', 'topics.replyCount', { count: 0 })).toBe('0 réponse');
    expect(translate('en', 'topics.replyCount', { count: 0 })).toBe('0 replies');
  });

  it('formats numbers for the locale', () => {
    expect(translate('en', 'topics.replyCount', { count: 1234 })).toBe('1,234 replies');
    expect(translate('es', 'topics.replyCount', { count: 1234 })).toBe('1234 respuestas');
  });

  it.each(LOCALES)('%s has a singular form for every counted key', (locale) => {
    const counted = englishKeys.filter(
      (key) => !key.endsWith('_one') && TRANSLATIONS.en[key].includes('{count}'),
    );

    const missing = counted.filter((key) => !(`${key}_one` in TRANSLATIONS[locale]));

    expect(missing).toEqual([]);
  });
});

describe('translate', () => {
  it('substitutes named placeholders', () => {
    expect(translate('en', 'topics.replyCount', { count: 12 })).toBe('12 replies');
  });

  it('translates into the requested locale', () => {
    expect(translate('es', 'nav.signIn')).toBe('Iniciar sesión');
    expect(translate('fr', 'nav.signIn')).toBe('Se connecter');
  });

  it('leaves an unknown placeholder untouched rather than printing "undefined"', () => {
    expect(translate('en', 'topics.replyCount', { wrong: 1 })).toBe('{count} replies');
  });

  it('substitutes several placeholders in one string', () => {
    expect(translate('en', 'search.resultCount', { count: 3, query: 'copper' })).toBe(
      '3 results for “copper”',
    );
  });
});
