/**
 * All UI languages, discovered from the files in ./locales. Adding a language means adding
 * `locales/<code>.json` (and optionally `help/content/<code>.ts`) – nothing else has to be registered.
 * See documentation/adding-a-language.md.
 */
export type Messages = { [key: string]: string | Messages };

/** Language whose texts are the reference for all others and the fallback for missing ones */
export const DEFAULT_LANGUAGE = 'en';

const files = import.meta.glob<Messages>('./locales/*.json', { eager: true, import: 'default' });

/** Translations per language code, e.g. `{ de: {...}, en: {...} }` */
export const LOCALES: Record<string, Messages> = Object.fromEntries(
  Object.entries(files).map(([path, messages]) => [path.match(/([\w-]+)\.json$/)![1], messages]),
);

/** Language codes in display order: the default language first, then alphabetically */
export const APP_LANGUAGES: string[] = Object.keys(LOCALES).sort((a, b) => (a === DEFAULT_LANGUAGE ? -1 : b === DEFAULT_LANGUAGE ? 1 : a.localeCompare(b)));

/** Stored choice meaning "the language of the operating system" (also what a first start uses) */
export const SYSTEM_LANGUAGE = 'system';

/**
 * The app language that fits the languages of the operating system / browser (in order of preference): an exact match
 * ("pt") or the language without region ("de-AT" → "de"); if the app does not speak any of them, the default language.
 */
export function systemLanguage(
  preferred: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language],
): string {
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    const found = APP_LANGUAGES.find((code) => code.toLowerCase() === lower) ?? APP_LANGUAGES.find((code) => code.toLowerCase() === lower.split('-')[0]);
    if (found) {
      return found;
    }
  }
  return DEFAULT_LANGUAGE;
}

/** Name of a language in that language itself ("Deutsch", "English", "Русский") */
export function nativeLanguageName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
  } catch {
    return code;
  }
}
