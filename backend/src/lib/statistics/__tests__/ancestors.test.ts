import { ancestorCoverage, ancestorPersons, personWithMostAncestors } from '../ancestors.js';

const person = (id: string, gender = 'UNKNOWN', birthDate?: string) => ({ id, gender, birthDate });
const rel = (personAId: string, personBId: string, type: string) => ({ personAId, personBId, type });

// Child → father (1935) → grandpa (1900) and grandma (1905) → great-grandparent of unknown gender (1850)
const persons = [
  person('kind', 'UNKNOWN', '2000'),
  person('father', 'MALE', '1935'),
  person('opa', 'MALE', '1900'),
  person('oma', 'FEMALE', 'um 1905'),
  person('urahn', 'UNKNOWN', '1850'),
];
const relations = [
  rel('father', 'kind', 'CHILD'),
  rel('opa', 'father', 'CHILD'),
  rel('father', 'oma', 'MOTHER'),
  rel('urahn', 'opa', 'CHILD'),
  rel('opa', 'oma', 'WIFE'),
];

describe('ancestors of a person', () => {
  it('counts the ancestors found per generation, their years of birth and the open ends', () => {
    const { generations, found, distinct } = ancestorCoverage(persons, relations, 'kind');
    expect(generations.map((g) => [g.generation, g.possible, g.found, g.distinct, g.openEnds, g.earliestBirth, g.latestBirth])).toEqual([
      [1, 1, 1, 1, 1, 2000, 2000],
      [2, 2, 1, 1, 0, 1935, 1935],
      [3, 4, 2, 2, 2, 1900, 1905],
      [4, 8, 1, 1, 1, 1850, 1850],
    ]);
    expect(generations[2]).toMatchObject({ filter: 'ancestors:kind:3', openEndsFilter: 'openEnds:kind:3' });
    expect({ found, distinct }).toEqual({ found: 4, distinct: 4 });
  });

  it('counts an ancestor who fills two places twice (pedigree collapse)', () => {
    // The parents are siblings: their parents a and b appear on both sides
    const family = ['c', 'f', 'm', 'a', 'b'].map((id) => person(id, id === 'f' || id === 'a' ? 'MALE' : 'FEMALE'));
    const links = [
      rel('c', 'f', 'FATHER'),
      rel('c', 'm', 'MOTHER'),
      rel('f', 'a', 'FATHER'),
      rel('f', 'b', 'MOTHER'),
      rel('m', 'a', 'FATHER'),
      rel('m', 'b', 'MOTHER'),
    ];
    const coverage = ancestorCoverage(family, links, 'c');
    expect(coverage.generations[2]).toMatchObject({ possible: 4, found: 4, distinct: 2 });
    expect({ found: coverage.found, distinct: coverage.distinct }).toEqual({ found: 6, distinct: 4 });
  });

  it('stops after 15 generations, also with a cycle in the data', () => {
    const loop = [person('x', 'MALE'), person('y', 'MALE')];
    const coverage = ancestorCoverage(loop, [rel('x', 'y', 'FATHER'), rel('y', 'x', 'FATHER')], 'x');
    expect(coverage.generations).toHaveLength(15);
    expect(personWithMostAncestors(loop, [rel('x', 'y', 'FATHER'), rel('y', 'x', 'FATHER')])).not.toBeNull();
  });

  it('lists the ancestors and the open ends of a generation', () => {
    expect(ancestorPersons(persons, relations, 'ancestors:kind:3').map((p) => p.id)).toEqual(['opa', 'oma']);
    expect(ancestorPersons(persons, relations, 'openEnds:kind:2')).toEqual([]);
    expect(ancestorPersons(persons, relations, 'openEnds:kind:4').map((p) => p.id)).toEqual(['urahn']);
    for (const filter of ['ancestors:kind', 'ancestors:nobody:2', 'openEnds:kind:x']) {
      expect(() => ancestorPersons(persons, relations, filter)).toThrow(expect.objectContaining({ reason: 'BAD_FILTER' }));
    }
  });

  it('finds the person with the most ancestors as a start', () => {
    expect(personWithMostAncestors(persons, relations)).toBe('kind');
    expect(personWithMostAncestors([], [])).toBeNull();
  });

  it('counts the ancestors of everybody within 15 generations, also deep in a long line', () => {
    // A line of 13 fathers above c0 ends in n1, who has four complete generations above them. c0 reaches n1 only in
    // generation 14 (16 places within 15 generations); c3 still reaches all of n1's pedigree: 10 + 31 = 41 places, the most.
    // Counted from c0 first, a pedigree cut off below c0 must not be taken over for c3.
    const line = Array.from({ length: 13 }, (_, i) => person(`c${i}`, 'MALE'));
    const pedigree = Array.from({ length: 31 }, (_, i) => person(`n${i + 1}`, i % 2 ? 'MALE' : 'FEMALE'));
    const links = [
      ...line.map((p, i) => rel(p.id, i < 12 ? `c${i + 1}` : 'n1', 'FATHER')),
      ...Array.from({ length: 15 }, (_, i) => [rel(`n${i + 1}`, `n${2 * i + 2}`, 'FATHER'), rel(`n${i + 1}`, `n${2 * i + 3}`, 'MOTHER')]).flat(),
    ];
    expect(ancestorCoverage([...line, ...pedigree], links, 'c0').found).toBe(15);
    expect(personWithMostAncestors([...line, ...pedigree], links)).toBe('c3');
  });
});
