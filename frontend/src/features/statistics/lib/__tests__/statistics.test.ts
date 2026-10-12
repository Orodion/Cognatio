import { describe, it, expect } from 'vitest';
import { makePerson } from '@/test/fixtures';
import { computeStatistics, rank, yearOf } from '../statistics';

const rel = (id: string, personAId: string, personBId: string, type: string) => ({ id, personAId, personBId, type });

describe('yearOf', () => {
  it('reads the year from all supported date formats', () => {
    expect(yearOf('04.01.1980')).toBe(1980);
    expect(yearOf('01.1980')).toBe(1980);
    expect(yearOf('um 1980')).toBe(1980);
    expect(yearOf('1980-1985')).toBe(1980);
    expect(yearOf('irgendwann')).toBeNull();
    expect(yearOf(null)).toBeNull();
  });
});

describe('rank', () => {
  it('groups case-insensitively and shows the most common spelling', () => {
    const { top, distinct, total } = rank(['Müller', 'müller', 'Müller', ' Schmidt ', null, '', 'Weber', 'Schmidt']);
    expect(top).toEqual([
      { label: 'Müller', count: 3 },
      { label: 'Schmidt', count: 2 },
      { label: 'Weber', count: 1 },
    ]);
    expect(distinct).toBe(3);
    expect(total).toBe(6);
  });

  it('limits the result', () => {
    expect(rank(['a', 'b', 'c'], 2).top).toHaveLength(2);
  });

  it('sorts equally frequent entries by the language of the UI', () => {
    // Swedish puts "ä" after "z", German between "a" and "b"
    const values = ['Äpfel', 'Zorn'];
    expect(rank(values, 10, 'de').top.map((r) => r.label)).toEqual(['Äpfel', 'Zorn']);
    expect(rank(values, 10, 'sv').top.map((r) => r.label)).toEqual(['Zorn', 'Äpfel']);
  });
});

describe('computeStatistics', () => {
  // Grandpa (1900–1980) ∞ grandma (1905–1990) → father (1935, alive) → child (2000); plus an ancestor without death data and an unconnected person
  const persons = [
    makePerson({ id: 'opa', lastName: 'Muster', gender: 'MALE', birthDate: '1900', deathDate: '1980', birthPlace: 'Köln' }),
    makePerson({ id: 'oma', lastName: 'Muster', gender: 'FEMALE', birthDate: 'um 1905', deathDate: '1990', birthPlace: 'köln' }),
    makePerson({ id: 'father', lastName: 'Muster', gender: 'MALE', birthDate: '1935', birthPlace: 'Bonn' }),
    makePerson({ id: 'kind', lastName: 'Muster', gender: 'UNKNOWN', birthDate: '04.01.2000' }),
    makePerson({ id: 'urahn', lastName: 'Alt', gender: 'UNKNOWN', birthDate: '1850' }),
    makePerson({ id: 'lose', lastName: 'Einzeln', gender: 'UNKNOWN', deathPlace: 'Berlin' }),
  ];
  const relations = [
    rel('r1', 'opa', 'oma', 'WIFE'),
    rel('r2', 'opa', 'father', 'CHILD'),
    rel('r3', 'father', 'oma', 'MOTHER'),
    rel('r4', 'father', 'kind', 'CHILD'),
    rel('r5', 'urahn', 'opa', 'CHILD'),
    rel('r6', 'kind', 'weg', 'FATHER'),
  ];
  const stats = computeStatistics(persons, relations, 2026);

  it('counts persons, living/deceased, gender and relations between known persons', () => {
    expect(stats).toMatchObject({ total: 6, living: 3, deceased: 3, male: 2, female: 1, unknownGender: 3, relations: 5 });
  });

  it('splits ages into living (current age) and deceased (age reached)', () => {
    // Alive: father 91, child 26; the ancestor would be 176 → probably deceased
    expect(stats.livingAges.filter((b) => b.count)).toEqual([
      { from: 20, count: 1 },
      { from: 90, count: 1 },
    ]);
    expect(stats.livingAges).toHaveLength(10);
    // Verstorben: Opa 80, Oma 85
    expect(stats.deathAges.filter((b) => b.count)).toEqual([{ from: 80, count: 2 }]);
    expect(stats.probablyDeceased).toBe(1);
    // The unconnected person is deceased, but without a birth year
    expect(stats.withoutAge).toBe(1);
    expect(stats.averageLifespan).toBe(83);
    expect(stats.oldestBirth).toMatchObject({ year: 1850, person: { id: 'urahn' } });
  });

  it('ranks surnames and birthplaces', () => {
    expect(stats.surnames[0]).toEqual({ label: 'Muster', count: 4 });
    expect(stats.distinctSurnames).toBe(3);
    expect(stats.birthplaces).toEqual([
      { label: 'Köln', count: 2 },
      { label: 'Bonn', count: 1 },
    ]);
    expect(stats.withBirthplace).toBe(3);
  });

  it('builds the generation overview per family group', () => {
    expect(stats.generations).toEqual([
      // Generation 1: the ancestor and the unconnected person
      { generation: 1, count: 2, earliestBirth: 1850, latestBirth: 1850 },
      { generation: 2, count: 2, earliestBirth: 1900, latestBirth: 1905 },
      { generation: 3, count: 1, earliestBirth: 1935, latestBirth: 1935 },
      { generation: 4, count: 1, earliestBirth: 2000, latestBirth: 2000 },
    ]);
    expect(stats.families).toBe(1);
    expect(stats.unconnected).toBe(1);
  });

  it('handles an empty database', () => {
    expect(computeStatistics([], [], 2026)).toMatchObject({
      total: 0,
      livingAges: [],
      deathAges: [],
      generations: [],
      averageLifespan: null,
      oldestBirth: null,
    });
  });
});
