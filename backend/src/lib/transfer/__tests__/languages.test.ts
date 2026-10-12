import fs from 'node:fs';
import path from 'node:path';
import { LANGUAGE_CODES, languageCode } from '../languages.js';

describe('languageCode', () => {
  it('keeps a code and reads the language of a tag', () => {
    expect(languageCode('de')).toBe('de');
    expect(languageCode(' EN ')).toBe('en');
    expect(languageCode('de-AT')).toBe('de');
    expect(languageCode('pt_BR')).toBe('pt');
  });

  it('recognises the name in the languages of the app and in the language itself', () => {
    expect(languageCode('German')).toBe('de');
    expect(languageCode('Deutsch')).toBe('de');
    expect(languageCode('allemand')).toBe('de');
    expect(languageCode('Español')).toBe('es');
    expect(languageCode('espanol')).toBe('es');
    expect(languageCode('Русский')).toBe('ru');
    expect(languageCode('українська')).toBe('uk');
    expect(languageCode('Polish')).toBe('pl');
    expect(languageCode('Latin')).toBe('la');
  });

  it('returns what it does not know unchanged (without surrounding blanks)', () => {
    expect(languageCode('  Esperanto ')).toBe('Esperanto');
    expect(languageCode('xx')).toBe('xx');
    expect(languageCode('')).toBe('');
  });

  it('has the same languages as the frontend', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../../../frontend/src/features/persons/lib/languages.ts'), 'utf8');
    const list = source.slice(source.indexOf('LANGUAGE_CODES = ['), source.indexOf('] as const'));
    expect([...list.matchAll(/'([a-z]{2})'/g)].map((m) => m[1])).toEqual([...LANGUAGE_CODES]);
  });
});
