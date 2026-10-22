import { computeStatistics, personsOf, filterKey, FILTER_KINDS, type StatPerson } from '../statistics.js';
import { selectScope, yearOf } from '../scope.js';

const person = (id: string, values: Partial<StatPerson> = {}): StatPerson => ({ id, firstName: id, gender: 'UNKNOWN', ...values });
const rel = (personAId: string, personBId: string, type: string) => ({ personAId, personBId, type });

// Grandpa (1900–1980) ∞ grandma (1905–1990) → father (1935, alive) → child (2000); plus an ancestor without death data and an unconnected person
const persons = [
  person('opa', { lastName: 'Muster', gender: 'MALE', birthDate: '1900', deathDate: '1980', birthPlace: 'Köln' }),
  person('oma', { lastName: 'Muster', birthName: 'Alt', gender: 'FEMALE', birthDate: 'um 1905', deathDate: '1990', birthPlace: 'köln' }),
  person('father', { lastName: 'Muster', gender: 'MALE', birthDate: '1935', birthPlace: 'Bonn' }),
  person('kind', { lastName: 'muster', birthDate: '04.01.2000' }),
  person('urahn', { lastName: 'Alt', birthDate: '1850' }),
  person('lose', { lastName: 'Einzeln', deathPlace: 'Berlin' }),
];
const relations = [
  rel('opa', 'oma', 'WIFE'),
  rel('opa', 'father', 'CHILD'),
  rel('father', 'oma', 'MOTHER'),
  rel('father', 'kind', 'CHILD'),
  rel('urahn', 'opa', 'CHILD'),
  rel('kind', 'weg', 'FATHER'),
];
const { statistics: stats, groups } = computeStatistics(persons, relations, { currentYear: 2026 });
const ids = (filter: string) => personsOf(persons, groups, filter).map((p) => p.id);

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

describe('computeStatistics', () => {
  it('counts persons, living/deceased, gender and relations between known persons', () => {
    expect(stats).toMatchObject({ total: 6, living: 3, deceased: 3, male: 2, female: 1, unknownGender: 3, relations: 5 });
  });

  it('splits ages into living (current age) and deceased (age reached)', () => {
    // Alive: father 91, child 26; the ancestor would be 176 → probably deceased
    expect(stats.livingAges.filter((b) => b.count)).toEqual([
      { from: 20, count: 1, filter: 'livingAge:20' },
      { from: 90, count: 1, filter: 'livingAge:90' },
    ]);
    expect(stats.livingAges).toHaveLength(10);
    expect(stats.deathAges.filter((b) => b.count)).toEqual([{ from: 80, count: 2, filter: 'deathAge:80' }]);
    expect(stats.probablyDeceased).toBe(1);
    // The unconnected person is deceased, but without a birth year
    expect(stats.withoutAge).toBe(1);
    expect(stats.averageLifespan).toBe(83);
    expect(stats.oldestBirth).toMatchObject({ year: 1850, person: { id: 'urahn' } });
  });

  it('ranks surnames and birthplaces ignoring case, with the most frequent spelling', () => {
    expect(stats.surnames[0]).toEqual({ label: 'Muster', count: 4, filter: 'surname:Muster' });
    expect(stats.distinctSurnames).toBe(3);
    expect(stats.birthplaces).toEqual([
      { label: 'Köln', count: 2, filter: 'birthplace:Köln' },
      { label: 'Bonn', count: 1, filter: 'birthplace:Bonn' },
    ]);
    expect(stats.withBirthplace).toBe(3);
  });

  it('sorts equally frequent names by the language of the user', () => {
    // Swedish puts "ä" after "z", German between "a" and "b"
    const two = [person('a', { lastName: 'Äpfel' }), person('z', { lastName: 'Zorn' })];
    expect(computeStatistics(two, [], { language: 'de' }).statistics.surnames.map((r) => r.label)).toEqual(['Äpfel', 'Zorn']);
    expect(computeStatistics(two, [], { language: 'sv' }).statistics.surnames.map((r) => r.label)).toEqual(['Zorn', 'Äpfel']);
  });

  it('lists the ten most frequent names only', () => {
    const many = Array.from({ length: 12 }, (_, i) => person(`p${i}`, { lastName: `Name${i}` }));
    const { statistics } = computeStatistics(many, []);
    expect(statistics.distinctSurnames).toBe(12);
    expect(statistics.surnames).toHaveLength(10);
  });

  it('builds the generation overview per family group', () => {
    expect(stats.generations).toEqual([
      // Generation 1: the ancestor and the unconnected person
      { generation: 1, count: 2, earliestBirth: 1850, latestBirth: 1850, filter: 'generation:1' },
      { generation: 2, count: 2, earliestBirth: 1900, latestBirth: 1905, filter: 'generation:2' },
      { generation: 3, count: 1, earliestBirth: 1935, latestBirth: 1935, filter: 'generation:3' },
      { generation: 4, count: 1, earliestBirth: 2000, latestBirth: 2000, filter: 'generation:4' },
    ]);
    expect(stats.families).toBe(1);
    expect(stats.unconnected).toBe(1);
  });

  it('handles an empty family tree', () => {
    expect(computeStatistics([], [], { currentYear: 2026 }).statistics).toMatchObject({
      total: 0,
      livingAges: [],
      deathAges: [],
      generations: [],
      averageLifespan: null,
      oldestBirth: null,
    });
  });
});

describe('completeness', () => {
  const { statistics, groups: missing } = computeStatistics(persons, relations, {
    currentYear: 2026,
    withMedia: new Set(['opa']),
    cited: new Set(['oma', 'kind']),
  });
  const row = (fact: string) => statistics.completeness.rows.find((r) => r.fact === fact);

  it('counts every fact for the persons it applies to', () => {
    expect(statistics.completeness.rows.map((r) => [r.fact, r.present, r.total])).toEqual([
      ['birthDate', 5, 6],
      ['birthPlace', 3, 6],
      // Dates and places of death, partners: only the deceased (grandpa, grandma, the unconnected person)
      ['deathDate', 2, 3],
      ['deathPlace', 1, 3],
      // The ancestor without a gender counts as grandpa's father
      ['father', 3, 6],
      ['mother', 1, 6],
      ['partner', 2, 3],
      ['photo', 1, 6],
      ['source', 2, 6],
    ]);
    expect(statistics.completeness.score).toBeCloseTo(4.1667 / 9, 3);
  });

  it('lists the persons without a fact', () => {
    expect(row('father')).toMatchObject({ missing: 3, filter: 'missing:father' });
    expect(personsOf(persons, missing, 'missing:father').map((p) => p.id)).toEqual(['oma', 'urahn', 'lose']);
    expect(personsOf(persons, missing, 'missing:deathDate').map((p) => p.id)).toEqual(['lose']);
  });

  it('does not expect a partner of somebody who died as a child, and finds parents outside the scope', () => {
    const child = person('child', { birthDate: '1900', deathDate: '1905' });
    const mother = person('mother', { gender: 'FEMALE' });
    const result = computeStatistics([child], [rel('child', 'mother', 'MOTHER')], { everyone: [child, mother] });
    expect(result.statistics.completeness.rows.find((r) => r.fact === 'partner')?.total).toBe(0);
    expect(result.statistics.completeness.rows.find((r) => r.fact === 'mother')?.present).toBe(1);
  });

  it('has no score without persons', () => {
    expect(computeStatistics([], []).statistics.completeness.score).toBeNull();
  });
});

describe('the persons behind a figure', () => {
  it('lists exactly as many persons as every figure counts', () => {
    const figures: Array<[string, number]> = [
      ['all', stats.total],
      ['living', stats.living],
      ['deceased', stats.deceased],
      ['gender:MALE', stats.male],
      ['gender:FEMALE', stats.female],
      ['gender:UNKNOWN', stats.unknownGender],
      ['withoutAge', stats.withoutAge],
      ['probablyDeceased', stats.probablyDeceased],
      ['lifespan', stats.deathAges.reduce((sum, b) => sum + b.count, 0)],
      ['unconnected', stats.unconnected],
      ['family', stats.total - stats.unconnected],
      ...stats.completeness.rows.map((r): [string, number] => [r.filter, r.missing]),
      ...stats.timeline.decades.flatMap((d): Array<[string, number]> => [
        [`bornDecade:${d.decade}`, d.births],
        [`diedDecade:${d.decade}`, d.deaths],
      ]),
      ['noBirthYear', stats.timeline.withoutBirthYear],
      ...[...stats.firstNames.male, ...stats.firstNames.female].map((n): [string, number] => [n.filter, n.count]),
      ...stats.migration.places.map((p): [string, number] => [p.filter, p.persons]),
      ...stats.migration.moves.map((m): [string, number] => [m.filter, m.count]),
      ['stayed:yes', stats.migration.stayed],
      ['stayed:no', stats.migration.moved],
      ['noDeathYear', stats.timeline.withoutDeathYear],
      ...stats.lives.tables.flatMap((t) => t.rows.flatMap((r) => [r.male, r.female, r.all].map((c): [string, number] => [c.filter, c.count]))),
      ...[...stats.livingAges, ...stats.deathAges, ...stats.surnames, ...stats.birthplaces, ...stats.generations].map((item): [string, number] => [
        item.filter,
        item.count,
      ]),
    ];
    for (const [filter, count] of figures) {
      expect([filter, ids(filter).length]).toEqual([filter, count]);
    }
  });

  it('finds the persons ignoring case and keeps their order', () => {
    expect(ids('surname:MUSTER')).toEqual(['opa', 'oma', 'father', 'kind']);
    expect(ids('birthplace:köln')).toEqual(['opa', 'oma']);
    expect(ids('deathAge:80')).toEqual(['opa', 'oma']);
    expect(ids('surname:Nobody')).toEqual([]);
  });

  it('refuses unknown filters and filters without their value', () => {
    for (const filter of ['', 'nonsense', 'surname', 'surname:  ', 'all:1', 'gender']) {
      expect(() => filterKey(filter)).toThrow(expect.objectContaining({ reason: 'BAD_FILTER' }));
    }
    // Each kind works either alone or with a value
    const usable = (filter: string) => {
      try {
        return !!filterKey(filter);
      } catch {
        return false;
      }
    };
    for (const kind of FILTER_KINDS) {
      expect([kind, [kind, `${kind}:1`].filter(usable).length]).toEqual([kind, 1]);
    }
  });
});

describe('selectScope', () => {
  const scope = (value: Parameters<typeof selectScope>[2]) => selectScope(persons, relations, value).map((p) => p.id);

  it('takes the whole family tree without a scope', () => {
    expect(scope(null)).toEqual(persons.map((p) => p.id));
    expect(scope({ kind: 'ALL' })).toEqual(persons.map((p) => p.id));
  });

  it('takes the ancestors or the descendants of a person, the person included', () => {
    expect(scope({ kind: 'ANCESTORS', personId: 'father' })).toEqual(['opa', 'oma', 'father', 'urahn']);
    expect(scope({ kind: 'DESCENDANTS', personId: 'opa' })).toEqual(['opa', 'father', 'kind']);
  });

  it('takes the persons of a last name, also by their birth name', () => {
    expect(scope({ kind: 'SURNAME', surname: ' alt ' })).toEqual(['oma', 'urahn']);
  });

  it('narrows any scope to a range of years of birth', () => {
    expect(scope({ bornFrom: 1900, bornTo: 1935 })).toEqual(['opa', 'oma', 'father']);
    expect(scope({ kind: 'SURNAME', surname: 'Muster', bornFrom: 1930 })).toEqual(['father', 'kind']);
    expect(scope({ bornTo: 1899 })).toEqual(['urahn']);
  });

  it('refuses a scope it cannot use', () => {
    expect(() => scope({ kind: 'ELSEWHERE' })).toThrow(expect.objectContaining({ reason: 'BAD_SCOPE' }));
    expect(() => scope({ kind: 'SURNAME', surname: ' ' })).toThrow(expect.objectContaining({ reason: 'BAD_SCOPE' }));
    expect(() => scope({ bornFrom: 1950, bornTo: 1900 })).toThrow(expect.objectContaining({ reason: 'BAD_SCOPE' }));
    expect(() => scope({ kind: 'ANCESTORS', personId: 'weg' })).toThrow(expect.objectContaining({ reason: 'PERSON_NOT_FOUND' }));
  });

  it('counts relations only between persons of the scope', () => {
    const ancestors = selectScope(persons, relations, { kind: 'ANCESTORS', personId: 'father' });
    expect(computeStatistics(ancestors, relations, { currentYear: 2026 }).statistics).toMatchObject({ total: 4, relations: 4, families: 1 });
  });
});
