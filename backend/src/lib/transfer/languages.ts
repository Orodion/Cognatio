/**
 * Languages of a person are stored as ISO 639-1 codes ("de"); the frontend shows them by name in the language of the UI
 * (frontend/src/features/persons/lib/languages.ts has the same list). Files of other programs write the name instead
 * ("German", "Deutsch") or a language tag ("de-DE"): `languageCode` turns those into the code, so the same language is
 * not stored in two ways. A value that is not recognised stays as it is and is shown unchanged.
 */
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

/** The languages of the app, in which a language is recognised by its name (and always by its own name) */
const NAME_LOCALES = ['en', 'de', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'ru', 'uk'];

/** Lower case without accents, so "Español", "espanol" and "ESPAÑOL" are the same */
const normalize = (value: string) => value.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let byName: Map<string, string> | undefined;

function namesToCodes(): Map<string, string> {
  if (byName) {
    return byName;
  }
  const map = new Map<string, string>();
  for (const code of LANGUAGE_CODES) {
    for (const locale of [...NAME_LOCALES, code]) {
      try {
        const name = new Intl.DisplayNames([locale], { type: 'language' }).of(code);
        if (name && name !== code && !map.has(normalize(name))) {
          map.set(normalize(name), code);
        }
      } catch {
        // a locale this Node does not know – the other names still work
      }
    }
  }
  byName = map;
  return map;
}

/** Code for a language name or tag; anything that is not recognised is returned unchanged (without surrounding blanks) */
export function languageCode(value: string): string {
  const trimmed = value.trim();
  // "de", "DE", "de-DE", "de_AT": the first part is the language
  const tag = trimmed.toLowerCase().split(/[-_]/)[0];
  if ((LANGUAGE_CODES as readonly string[]).includes(tag) && /^[A-Za-z]{2}([-_][A-Za-z0-9]+)*$/.test(trimmed)) {
    return tag;
  }
  return namesToCodes().get(normalize(trimmed)) ?? trimmed;
}
