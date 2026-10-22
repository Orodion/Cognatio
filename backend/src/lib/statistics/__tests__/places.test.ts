import { Groups } from '../groups.js';
import { firstNames, givenNames } from '../names.js';
import { migration } from '../migration.js';
import { familyRecords } from '../records.js';
import { marriages } from '../marriages.js';

const collator = new Intl.Collator('de');
const ids = (groups: Groups, key: string) => [...(groups.members.get(key) ?? [])].sort();

describe('first names', () => {
  const persons = [
    { id: 'a', firstName: 'Johann Georg', gender: 'MALE', birthDate: '1750' },
    { id: 'b', firstName: 'johann', middleName: 'Peter', gender: 'MALE', birthDate: '1820' },
    { id: 'c', firstName: 'Johann', gender: 'MALE', birthDate: '1830' },
    { id: 'd', firstName: 'Anna-Maria', gender: 'FEMALE', birthDate: '1835' },
    { id: 'e', firstName: '(Vorname unbekannt)', gender: 'FEMALE' },
    { id: 'f', firstName: 'Kim', gender: 'UNKNOWN' },
  ];

  it('counts every given name, keeps a hyphenated one whole and leaves the placeholder out', () => {
    expect(givenNames(persons[0])).toEqual(['Johann', 'Georg']);
    expect(givenNames(persons[3])).toEqual(['Anna-Maria']);
    expect(givenNames(persons[4])).toEqual([]);
  });

  it('ranks the names per gender and shows the fashion per century', () => {
    const groups = new Groups();
    const result = firstNames(persons, groups, collator);
    expect(result.male.map((n) => [n.label, n.count])).toEqual([
      ['Johann', 3],
      ['Georg', 1],
      ['Peter', 1],
    ]);
    expect(result.male[0].filter).toBe('firstName:male:all:Johann');
    expect(result.female.map((n) => n.label)).toEqual(['Anna-Maria']);
    expect(result.fashion.map((f) => [f.century, f.male.map((n) => n.label), f.female.map((n) => n.label)])).toEqual([
      [1700, ['Georg', 'Johann'], []],
      [1800, ['Johann', 'Peter'], ['Anna-Maria']],
    ]);
    expect(ids(groups, 'firstName:male:1800:johann')).toEqual(['b', 'c']);
  });
});

describe('migration', () => {
  const persons = [
    { id: 'a', birthPlace: 'Halle', birthDate: '1850', deathPlace: 'halle ', deathDate: '1920' },
    { id: 'b', birthPlace: 'Halle', birthDate: '1880', deathPlace: 'Berlin', deathDate: '1950' },
    { id: 'c', birthPlace: 'Halle', deathPlace: 'Leipzig' },
    { id: 'd', birthPlace: 'Gotha' },
  ];
  const events = [
    { personId: 'c', category: 'MOVE', date: '1910', place: 'Berlin' },
    { personId: 'c', category: 'MOVE', date: '1900', place: 'Halle' },
    { personId: 'd', category: 'OCCUPATION', date: '1990', place: 'Gotha' },
  ];

  it('tells who stayed, the moves in the order of time and the places with their years', () => {
    const groups = new Groups();
    const result = migration(persons, events, groups, collator);
    expect(result).toMatchObject({ stayed: 1, moved: 2, morePlaces: 0 });
    expect(result.moves.map((m) => [m.from, m.to, m.count])).toEqual([
      ['Halle', 'Berlin', 2],
      ['Berlin', 'Leipzig', 1],
    ]);
    expect(result.moves[0].filter).toBe('move:Halle|Berlin');
    expect(result.places.map((p) => [p.place, p.persons, p.firstYear, p.lastYear])).toEqual([
      ['Halle', 3, 1850, 1920],
      ['Berlin', 2, 1910, 1950],
      ['Gotha', 1, 1990, 1990],
      ['Leipzig', 1, null, null],
    ]);
    expect(ids(groups, 'stayed:yes')).toEqual(['a']);
    expect(ids(groups, 'move:halle|berlin')).toEqual(['b', 'c']);
  });
});

describe('records', () => {
  const person = (id: string, gender: string, birthDate?: string, deathDate?: string) => ({ id, gender, birthDate, deathDate });
  const rel = (personAId: string, personBId: string, type: string, startDate?: string) => ({
    personAId,
    personBId,
    type,
    startDate: startDate ? new Date(startDate) : null,
  });
  const everyone = [
    person('opa', 'MALE', '1800', '1890'),
    person('oma', 'FEMALE', '1810', '1870'),
    person('kind1', 'MALE', '1828', '1900'),
    person('kind2', 'FEMALE', '1871', '1880'), // the mother would be 61
    person('alive', 'FEMALE', '1950'),
    person('enkel', 'MALE', '1860', '1940'),
  ];
  const relations = [
    rel('opa', 'oma', 'WIFE', '1830-06-01T00:00:00Z'),
    rel('kind1', 'opa', 'FATHER'),
    rel('kind1', 'oma', 'MOTHER'),
    rel('kind2', 'opa', 'FATHER'),
    rel('kind2', 'oma', 'MOTHER'),
    rel('enkel', 'kind1', 'FATHER'),
    rel('alive', 'kind1', 'FATHER'),
  ];
  const records = familyRecords(everyone, everyone, relations, marriages(relations, [], new Set(everyone.map((p) => p.id))));
  const record = (kind: string) => records.find((r) => r.kind === kind)!;

  it('finds the records among the deceased only', () => {
    expect(record('longestLife')).toMatchObject({ value: 90, persons: [everyone[0]], ties: 0, possibleError: false });
    // The marriage lasted from 1830 to the death of the wife in 1870
    expect(record('longestMarriage')).toMatchObject({ value: 40, persons: [everyone[0], everyone[1]] });
    // Grandpa, grandma and their son have two children each
    expect(record('mostChildren')).toMatchObject({ value: 2, persons: [everyone[0], everyone[1], everyone[2]], ties: 0 });
    expect(record('mostCommonChildren').value).toBe(2);
    expect(record('mostDescendants')).toMatchObject({ value: 4, persons: [everyone[0], everyone[1]] });
    expect(record('youngestFather')).toMatchObject({ value: 28 });
    expect(record('largestAgeGap').value).toBe(10);
  });

  it('marks a record that is also a possible error', () => {
    expect(record('oldestMother')).toMatchObject({ value: 61, possibleError: true });
  });

  it('names a mother of twins once', () => {
    const family = [person('mutter', 'FEMALE', '1900', '1980'), person('a', 'MALE', '1920', '1990'), person('b', 'FEMALE', '1920', '1995')];
    const twins = familyRecords(family, family, [rel('a', 'mutter', 'MOTHER'), rel('b', 'mutter', 'MOTHER')], []);
    for (const kind of ['youngestMother', 'oldestMother']) {
      expect(twins.find((r) => r.kind === kind)).toMatchObject({ value: 20, persons: [family[0]], ties: 0 });
    }
  });

  it('leaves out the living', () => {
    // The living granddaughter is not counted as a holder anywhere
    expect(records.every((r) => r.persons.every((p) => p.id !== 'alive'))).toBe(true);
    expect(familyRecords([everyone[4]], everyone, relations, [])).toEqual([]);
  });
});
