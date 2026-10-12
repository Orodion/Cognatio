import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_LANGUAGES, DEFAULT_LANGUAGE, LOCALES, SYSTEM_LANGUAGE, systemLanguage } from './locales';

export { APP_LANGUAGES, DEFAULT_LANGUAGE, SYSTEM_LANGUAGE, nativeLanguageName } from './locales';

const LANGUAGE_KEY = 'cognatio-language';

/** The language setting: a language code or "system" (the language of the operating system, also on the first start) */
export function languagePreference(): string {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(LANGUAGE_KEY);
  } catch {
    // storage blocked: the system language applies
  }
  // A stored language that no longer exists counts as "system"
  return stored && APP_LANGUAGES.includes(stored) ? stored : SYSTEM_LANGUAGE;
}

const languageOf = (preference: string) => (preference === SYSTEM_LANGUAGE ? systemLanguage() : preference);

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(LOCALES).map(([code, translation]) => [code, { translation }])),
  lng: languageOf(languagePreference()),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

// Keep <html lang> (screen readers, native inputs) and the window title in sync with the language
const syncDocument = (lng: string) => {
  document.documentElement.setAttribute('lang', lng);
  document.title = `${i18n.t('app.name')} - ${i18n.t('app.tagline')}`;
};
syncDocument(i18n.language);
i18n.on('languageChanged', syncDocument);

/** Switch the language (a code or "system") and remember the choice for the next visit */
export function setLanguage(preference: string) {
  i18n.changeLanguage(languageOf(preference));
  localStorage.setItem(LANGUAGE_KEY, preference);
}

export default i18n;
