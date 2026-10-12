import { describe, it, expect } from 'vitest';
import { RELEASES, RELEASE_NOTES, releaseNote } from '../releases';
import { HELP_SECTIONS } from '../sections';
import { APP_LANGUAGES, DEFAULT_LANGUAGE } from '@/i18n/locales';

const original = RELEASE_NOTES[DEFAULT_LANGUAGE];

const parse = (version: string) => version.split('.').map(Number);
const compare = (a: string, b: string) => {
  const [x, y] = [parse(a), parse(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

describe('RELEASES', () => {
  it('lists valid versions, newest first, without duplicates', () => {
    for (const { version, date } of RELEASES) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      if (date) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
    const versions = RELEASES.map((r) => r.version);
    expect(versions).toEqual([...versions].sort((a, b) => compare(b, a)));
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('links only to existing help sections and has no duplicate entries', () => {
    for (const { changes } of RELEASES) {
      expect(new Set(changes.map((c) => c.id)).size).toBe(changes.length);
      for (const { section } of changes) {
        if (section) {
          expect(HELP_SECTIONS).toContain(section);
        }
      }
    }
  });
});

// Every file found in help/releaseNotes – a new language is checked automatically
describe.each(Object.entries(RELEASE_NOTES))('release notes %s', (lang, notes) => {
  it('belongs to a UI language', () => {
    expect(APP_LANGUAGES).toContain(lang);
  });

  it('has exactly the versions and entries of the releases, with texts', () => {
    expect(Object.keys(notes).sort()).toEqual(RELEASES.map((r) => r.version).sort());
    for (const { version, changes } of RELEASES) {
      expect(Object.keys(notes[version]).sort()).toEqual(changes.map((c) => c.id).sort());
      for (const note of Object.values(notes[version])) {
        expect(note.title.trim()).not.toBe('');
        expect(note.text.trim()).not.toBe('');
      }
    }
  });
});

describe('releaseNote', () => {
  it('picks the language and falls back to the original', () => {
    expect(releaseNote('de', '1.0.0', 'trash').title).toBe('Papierkorb');
    expect(releaseNote('de-AT', '1.0.0', 'trash').title).toBe('Papierkorb');
    expect(releaseNote('cimode', '1.0.0', 'trash')).toBe(original['1.0.0'].trash);
    expect(releaseNote('en', '1.0.0', 'trash').title).toBe('Recycle bin');
  });
});
