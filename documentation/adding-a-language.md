# Adding a language

The UI languages are discovered from files – no code has to be changed to add one.

## Steps

1. **UI texts:** copy `frontend/src/i18n/locales/en.json` to `frontend/src/i18n/locales/<code>.json`
   (ISO 639-1 code, e.g. `uk`, `pl`, `fr`) and translate all values. Keep the keys.
   - Plural forms follow the rules of the language: English/German/Spanish/French/Italian/Portuguese/Dutch use `_one` and `_other`,
     Russian/Ukrainian/Polish also `_few` and `_many` (see the existing `ru.json`, `uk.json`, `pl.json`).
   - `dateWords` holds the words for approximate dates, separated by `|`, e.g.
     `"about": "environ|vers"`, `"after": "après"`, `"before": "avant"`. Date input accepts the
     words of every language.
2. **Help (optional):** copy `frontend/src/features/help/content/en.ts` to `frontend/src/features/help/content/<code>.ts`
   and translate the texts. Keep the section ids and the number of blocks per section. Without this
   file the help page shows the default language with a note.
   Likewise copy `frontend/src/features/help/releaseNotes/en.ts` for the chapter "Version history"
   (without it the entries are shown in English).
3. **Check:** `npm test` in `frontend/`. The tests check every language file automatically:
   same keys as the default language, no empty texts, help sections complete.

The language then appears in the selection list under Settings, named in its own language. The language
is not switched in the top bar.

## Limits

- The bundled font (Inter) covers Latin, Cyrillic and Greek scripts. Scripts such as Arabic, Hebrew,
  Chinese or Japanese need an additional font; right-to-left languages also need layout changes.
- The default language (`DEFAULT_LANGUAGE` in `frontend/src/i18n/locales.ts`) is the reference for
  the tests and the fallback for missing texts.
