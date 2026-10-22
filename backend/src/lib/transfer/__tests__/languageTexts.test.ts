import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseGedcom } from '../gedcom.js';
import {
  BIRTH_TITLE,
  DATE_WORDS,
  DEATH_TITLE,
  EVENT_TITLE,
  IMPORT_LANGUAGES,
  OCCUPATION_TITLE,
  RESIDENCE_TITLE,
  STANDARD_EVENTS,
  importLanguage,
  standardTitleKey,
} from '../languageTexts.js';

const localeFile = (language: string) => path.resolve(__dirname, '../../../../../frontend/src/i18n/locales', `${language}.json`);

const FOREIGN = [
  '0 HEAD',
  '1 GEDC',
  '2 VERS 5.5.1',
  '1 CHAR UTF-8',
  '0 @I1@ INDI',
  '1 NAME Johann /Muster/',
  '1 BIRT',
  '2 DATE ABT 1850',
  '1 BURI',
  '2 DATE BEF 1920',
  '1 EVEN',
  '2 DATE AFT 1900',
  '1 RESI',
  '2 ADDR Hauptstraße 1',
  '1 RESI',
  '2 PLAC Mainz',
  '1 FAMS @F1@',
  '0 @I2@ INDI',
  '1 NAME Maria /Muster/',
  '1 FAMS @F1@',
  '0 @I3@ INDI',
  '1 NAME Karl /Muster/',
  '1 FAMC @F1@',
  '2 PEDI adopted',
  '0 @F1@ FAM',
  '1 HUSB @I1@',
  '1 WIFE @I2@',
  '1 CHIL @I3@',
  '1 MARR',
  '2 PLAC Mainz',
  '0 TRLR',
].join('\n');

describe('language of imported texts', () => {
  it('takes the language of a request, otherwise English', () => {
    expect(importLanguage('de')).toBe('de');
    expect(importLanguage('pt-BR')).toBe('pt');
    expect(importLanguage(' UK ')).toBe('uk');
    expect(importLanguage('tr')).toBe('en');
    expect(importLanguage(undefined)).toBe('en');
    expect(importLanguage(['de'])).toBe('en');
  });

  it.each(IMPORT_LANGUAGES)('has the date words of the interface (%s)', (language) => {
    const words = (JSON.parse(readFileSync(localeFile(language), 'utf8')) as { dateWords: Record<string, string> }).dateWords;
    const list = (value: string) =>
      value
        .split('|')
        .map((w) => w.trim())
        .filter(Boolean);
    expect(DATE_WORDS[language]).toEqual({ about: list(words.about), after: list(words.after), before: list(words.before) });
  });

  const titles = (language?: (typeof IMPORT_LANGUAGES)[number]) => {
    const data = parseGedcom(FOREIGN, undefined, language);
    const johann = data.persons.find((p) => p.firstName === 'Johann')!;
    return {
      birth: johann.birthDate,
      events: johann.events.map((e) => [e.title, e.date]),
      child: data.relations.find((r) => r.type === 'CHILD')!.label,
      partner: data.relations.find((r) => r.type === 'HUSBAND' || r.type === 'WIFE')!.note,
    };
  };

  it('writes titles, labels and dates in English without a language', () => {
    expect(titles()).toEqual({
      birth: 'about 1850',
      events: [
        ['Burial', 'before 1920'],
        ['Event', 'after 1900'],
        ['Residence', null],
      ],
      child: 'Adopted child',
      partner: 'Wedding in Mainz',
    });
  });

  it('writes them in the language of the user', () => {
    expect(titles('fr')).toEqual({
      birth: 'vers 1850',
      events: [
        ['Inhumation', 'avant 1920'],
        ['Événement', 'après 1900'],
        ['Résidence', null],
      ],
      child: 'Enfant adoptif',
      partner: 'Mariage à Mainz',
    });
    expect(titles('uk').events[0]).toEqual(['Поховання', 'до 1920']);
    expect(titles('de').events[0]).toEqual(['Beerdigung', 'vor 1920']);
  });
});

describe('language-independent titles', () => {
  it('gives the same key to a title in every language and none to own titles', () => {
    expect(standardTitleKey('Beerdigung')).toBe('BURI');
    expect(standardTitleKey(' burial ')).toBe('BURI');
    expect(standardTitleKey('Поховання')).toBe('BURI');
    expect(standardTitleKey('Taufe')).toBe(standardTitleKey('Baptism'));
    expect(standardTitleKey('Goldene Hochzeit')).toBeNull();
  });

  it('never gives one text to two kinds of events', () => {
    const kinds = new Map<string, Set<string>>();
    const add = (kind: string, texts: Record<string, string>) => {
      for (const text of Object.values(texts)) {
        kinds.set(text.toLowerCase(), (kinds.get(text.toLowerCase()) ?? new Set()).add(kind));
      }
    };
    for (const [tag, { title }] of Object.entries(STANDARD_EVENTS)) {
      add(tag === 'CHR' ? 'BAPM' : tag, title);
    }
    for (const [kind, texts] of Object.entries({ EVENT_TITLE, BIRTH_TITLE, DEATH_TITLE, OCCUPATION_TITLE, RESIDENCE_TITLE })) {
      add(kind, texts);
    }
    expect([...kinds].filter(([, set]) => set.size > 1)).toEqual([]);
  });
});
