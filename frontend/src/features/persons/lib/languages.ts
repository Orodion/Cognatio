/** Selectable languages (ISO 639-1). The code is stored, the localised name is shown. */
export const LANGUAGE_CODES = [
  'de',
  'en',
  'ru',
  'uk',
  'pl',
  'fr',
  'es',
  'it',
  'pt',
  'nl',
  'cs',
  'sk',
  'hu',
  'ro',
  'bg',
  'hr',
  'sr',
  'sl',
  'el',
  'tr',
  'sv',
  'da',
  'no',
  'fi',
  'lt',
  'lv',
  'et',
  'be',
  'kk',
  'ka',
  'hy',
  'az',
  'yi',
  'he',
  'ar',
  'fa',
  'zh',
  'ja',
  'ko',
  'hi',
  'vi',
  'la',
] as const;

/**
 * Localised name of a language. Values that are not a known code
 * (e.g. older free-text entries like "Deutsch") are returned unchanged.
 */
export function languageName(value: string, locale: string): string {
  if (!(LANGUAGE_CODES as readonly string[]).includes(value)) {
    return value;
  }
  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(value);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : value;
  } catch {
    return value;
  }
}
