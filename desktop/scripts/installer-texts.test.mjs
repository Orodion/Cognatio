import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const nsh = read('../build/installer.nsh');
const builder = read('../electron-builder.yml');
const localesDir = new URL('../../frontend/src/i18n/locales/', import.meta.url);
const languages = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace('.json', ''));

// Windows language ids (NSIS $LANGUAGE) per language of the app
const WINDOWS_IDS = { de: [1031], es: [3082, 1034], fr: [1036], it: [1040], nl: [1043], pl: [1045], pt: [1046, 2070], ru: [1049], uk: [1058] };
// Languages of the installer itself (installerLanguages) per language of the app
const INSTALLER_LANGUAGES = {
  en: ['en_US'],
  de: ['de_DE'],
  es: ['es_ES'],
  fr: ['fr_FR'],
  it: ['it_IT'],
  nl: ['nl_NL'],
  pl: ['pl_PL'],
  pt: ['pt_BR', 'pt_PT'],
  ru: ['ru_RU'],
  uk: ['uk_UA'],
};

test('the uninstall questions exist in every language of the app', () => {
  for (const language of languages.filter((code) => code !== 'en')) {
    assert.ok(WINDOWS_IDS[language], `${language}: add its Windows language ids to this test and the texts to installer.nsh`);
    for (const id of WINDOWS_IDS[language]) {
      assert.match(nsh, new RegExp(`\\$LANGUAGE == ${id}\\b`), `${language}: no branch for language id ${id}`);
    }
  }
});

test('the hint names the menu entries of the app in each language', () => {
  for (const language of languages) {
    const texts = JSON.parse(fs.readFileSync(new URL(`${language}.json`, localesDir), 'utf8'));
    const menu = `${texts.nav.settings} > ${texts.settings.sections.data}`;
    assert.ok(nsh.includes(menu), `${language}: installer.nsh does not mention "${menu}"`);
  }
});

test('the installer itself is available in every language of the app', () => {
  for (const language of languages) {
    assert.ok(INSTALLER_LANGUAGES[language], `${language}: add the installer languages to this test and installerLanguages`);
    for (const code of INSTALLER_LANGUAGES[language]) {
      assert.ok(builder.includes(code), `${language}: ${code} is missing in installerLanguages`);
    }
  }
});

test('texts contain no characters that NSIS would interpret', () => {
  for (const match of nsh.matchAll(/StrCpy \$R[78] "([^\n]*)"/g)) {
    const text = match[1].replace(/\$\\r\$\\n/g, '');
    assert.doesNotMatch(text, /[$"]/, `special character in: ${text.slice(0, 40)}`);
    assert.ok(text.length < 900, 'string longer than the NSIS limit allows');
  }
});
