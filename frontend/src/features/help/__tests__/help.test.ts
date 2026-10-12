import { describe, it, expect } from 'vitest';
import { HELP_CONTENT, filterHelp, hasHelpFor, helpContent } from '..';
import { HELP_SECTIONS, helpSectionFor } from '../sections';
import { APP_LANGUAGES, DEFAULT_LANGUAGE } from '@/i18n/locales';

const helpDefault = HELP_CONTENT[DEFAULT_LANGUAGE];
// The search tests use German words
const helpDe = HELP_CONTENT.de;

/** Pages of the app (App.tsx) the help may link to */
const ROUTES = ['/', '/persons', '/tree', '/statistics', '/import-export', '/family-trees', '/trash', '/settings'];

// Every help file found in help/content – a new language is checked automatically
describe.each(Object.entries(HELP_CONTENT))('help content %s', (lang, sections) => {
  it('belongs to a UI language', () => {
    expect(APP_LANGUAGES).toContain(lang);
  });

  it('has every section in the same order', () => {
    expect(sections.map((s) => s.id)).toEqual([...HELP_SECTIONS]);
  });

  it('links only to existing pages and has no empty texts', () => {
    for (const section of sections) {
      if (section.link) {
        expect(ROUTES).toContain(section.link.to);
      }
      expect(section.title.trim()).not.toBe('');
      expect(section.blocks.length).toBeGreaterThan(0);
      for (const block of section.blocks) {
        const texts = 'p' in block ? [block.p] : 'faq' in block ? block.faq.flatMap((f) => [f.q, f.a]) : 'steps' in block ? block.steps : block.list;
        for (const text of texts) {
          expect(text.trim()).not.toBe('');
        }
      }
    }
  });

  it('has as many blocks per section as the default language', () => {
    expect(sections.map((s) => s.blocks.length)).toEqual(helpDefault.map((s) => s.blocks.length));
  });
});

describe('helpContent', () => {
  it('picks the language and falls back to the default language', () => {
    expect(helpContent('ru')).toBe(HELP_CONTENT.ru);
    expect(helpContent('en-GB')).toBe(HELP_CONTENT.en);
    expect(helpContent('cimode')).toBe(helpDefault);
    expect(hasHelpFor('en')).toBe(true);
    expect(hasHelpFor('xx')).toBe(false);
  });
});

describe('filterHelp', () => {
  it('returns all sections without a query', () => {
    expect(filterHelp(helpDe, '  ')).toHaveLength(helpDe.length);
  });

  it('matches every word, ignoring case and accents', () => {
    expect(filterHelp(helpDe, 'GEDCOM ancestry').map((s) => s.id)).toEqual(['import-export', 'faq']);
    expect(filterHelp(helpDe, 'loschen').map((s) => s.id)).toContain('backup');
    expect(filterHelp(helpDe, 'gibtesnicht')).toEqual([]);
  });
});

describe('helpSectionFor', () => {
  it('maps the pages of the app to their section', () => {
    expect(helpSectionFor('/')).toBe('getting-started');
    expect(helpSectionFor('/persons')).toBe('persons');
    expect(helpSectionFor('/persons/abc')).toBe('persons');
    expect(helpSectionFor('/import-export')).toBe('import-export');
    expect(helpSectionFor('/settings')).toBe('settings');
    expect(helpSectionFor('/unbekannt')).toBe('getting-started');
    expect(helpSectionFor('/help')).toBeNull();
  });
});
