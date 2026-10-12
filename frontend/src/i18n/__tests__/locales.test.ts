import { describe, it, expect } from 'vitest';
import { APP_LANGUAGES, DEFAULT_LANGUAGE, LOCALES, nativeLanguageName, systemLanguage, type Messages } from '../locales';

const flatKeys = (tree: Messages, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [`${prefix}${key}`] : flatKeys(value, `${prefix}${key}.`)));

// Plural forms differ per language (ru: _one/_few/_many/_other) and are merged
const baseKeys = (tree: Messages) => [...new Set(flatKeys(tree).map((key) => key.replace(/_(zero|one|two|few|many|other)$/, '')))].sort();

const reference = baseKeys(LOCALES[DEFAULT_LANGUAGE]);
const others = Object.entries(LOCALES).filter(([code]) => code !== DEFAULT_LANGUAGE);

describe('locales', () => {
  it('finds every language file, the default language first', () => {
    expect(APP_LANGUAGES[0]).toBe(DEFAULT_LANGUAGE);
    expect(APP_LANGUAGES).toEqual(expect.arrayContaining(['de', 'en', 'ru', 'es', 'fr', 'it', 'pt', 'pl', 'nl', 'uk']));
  });

  // Every file in i18n/locales is checked – a new language needs no change here
  it.each(others)('%s has exactly the same keys as the default language', (_, locale) => {
    expect(baseKeys(locale)).toEqual(reference);
  });

  it.each(Object.entries(LOCALES))('%s has no empty translations', (_, locale) => {
    const empty = flatKeys(locale).filter((key) => {
      const value = key.split('.').reduce<Messages | string>((node, part) => (node as Messages)[part], locale);
      return typeof value === 'string' && value.trim() === '';
    });
    expect(empty).toEqual([]);
  });

  it('picks the language of the operating system, English if the app does not speak it', () => {
    expect(systemLanguage(['de'])).toBe('de');
    expect(systemLanguage(['de-AT'])).toBe('de');
    expect(systemLanguage(['PT-br'])).toBe('pt');
    expect(systemLanguage(['uk-UA', 'en-US'])).toBe('uk');
    // First language the app speaks, in the order of preference
    expect(systemLanguage(['ja-JP', 'fr-FR'])).toBe('fr');
    expect(systemLanguage(['ja-JP', 'zh-CN'])).toBe(DEFAULT_LANGUAGE);
    expect(systemLanguage([])).toBe(DEFAULT_LANGUAGE);
  });

  it('names languages in their own language', () => {
    expect(nativeLanguageName('de')).toBe('Deutsch');
    expect(nativeLanguageName('uk')).toBe('Українська');
    expect(nativeLanguageName('ru')).toBe('Русский');
  });
});
