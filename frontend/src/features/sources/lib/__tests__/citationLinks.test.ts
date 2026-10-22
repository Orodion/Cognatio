import { describe, it, expect } from 'vitest';
import type { CitationLink } from '@/features/sources/types/source';
import { citationTitle, groupLinks, relationRole } from '../citationLinks';

const t = (key: string) => key;
const person = (id: string, firstName: string, gender = 'UNKNOWN') => ({ id, firstName, lastName: 'Dörr', gender });
const link = (overrides: Partial<CitationLink>): CitationLink => ({
  kind: 'PERSON',
  fact: null,
  person: person('p1', 'Catharina', 'FEMALE'),
  familyTreeId: 't1',
  familyTreeName: 'Dörr',
  ...overrides,
});

describe('relationRole', () => {
  it('names the role of the other person from either side of the relation', () => {
    // personB is MOTHER of personA
    expect(relationRole('MOTHER', true, {})).toBe('MOTHER');
    expect(relationRole('MOTHER', false, {})).toBe('CHILD');
    expect(relationRole('CHILD', false, { gender: 'MALE' })).toBe('FATHER');
    expect(relationRole('CHILD', false, { gender: 'FEMALE' })).toBe('MOTHER');
    expect(relationRole('CHILD', false, {})).toBe('PARENT');
    expect(relationRole('HUSBAND', false, { gender: 'FEMALE' })).toBe('WIFE');
    expect(relationRole('WIFE', false, {})).toBe('SPOUSE');
    expect(relationRole('SIBLING', false, {})).toBe('SIBLING');
  });
});

describe('groupLinks', () => {
  it('lists every person once with its facts in a fixed order', () => {
    const groups = groupLinks(
      [
        link({ fact: 'BIRTH' }),
        link({ kind: 'EVENT', eventId: 'e1', eventTitle: 'Taufe', eventDate: '1805' }),
        link({ fact: 'NAME' }),
        link({ fact: null }),
        link({ fact: 'BIRTH', person: person('p2', 'Adam', 'MALE') }),
      ],
      t,
    );
    expect(groups.map((g) => [g.person.id, g.facts.map((f) => f.label)])).toEqual([
      ['p1', ['sources.facts.GENERAL', 'sources.facts.NAME', 'sources.facts.BIRTH', 'Taufe (1805)']],
      ['p2', ['sources.facts.BIRTH']],
    ]);
  });

  it('lists a relation with the person that has other facts and names the role of the other one', () => {
    const catharina = person('p1', 'Catharina', 'FEMALE');
    const hanss = person('p2', 'Hanß', 'MALE');
    const andreas = person('p3', 'Andreas', 'MALE');
    const groups = groupLinks(
      [
        link({ fact: 'BIRTH', person: catharina }),
        // Hanß is personA: "Catharina is WIFE of Hanß" – Catharina has facts here, so it goes to her
        link({ kind: 'RELATION', relationId: 'r1', relationType: 'WIFE', person: hanss, otherPerson: catharina }),
        // Catharina is personA: "Andreas is CHILD of Catharina"
        link({ kind: 'RELATION', relationId: 'r2', relationType: 'CHILD', person: catharina, otherPerson: andreas }),
      ],
      t,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].facts.map((f) => f.label)).toEqual(['sources.facts.BIRTH', 'relations.types.HUSBAND: Hanß Dörr', 'relations.types.CHILD: Andreas Dörr']);
  });

  it('lists a relation without other facts with its first person', () => {
    const groups = groupLinks([link({ kind: 'RELATION', relationId: 'r1', relationType: 'MOTHER', otherPerson: person('p2', 'Eva', 'FEMALE') })], t);
    expect(groups.map((g) => [g.person.id, g.facts.map((f) => f.label)])).toEqual([['p1', ['relations.types.MOTHER: Eva Dörr']]]);
  });
});

describe('citationTitle', () => {
  it('uses page and date, else the beginning of the transcription', () => {
    expect(citationTitle({ page: 'S. 12', date: '1880', text: 'Getauft' }, t)).toBe('S. 12 · 1880');
    expect(citationTitle({ page: null, date: null, text: 'Getauft wurde am 4. Mai\nAnna' }, t)).toBe('Getauft wurde am 4. Mai Anna');
    expect(citationTitle({ page: null, date: null, text: 'x'.repeat(80) }, t)).toHaveLength(60);
    expect(citationTitle({ page: null, date: null, text: null }, t)).toBe('sources.citation.withoutPage');
  });
});
