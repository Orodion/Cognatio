import { TreeFacts, issueKey, relationIssues, treeIssues, type CheckPerson, type CheckRelation, type Issue } from '../checks.js';

const person = (id: string, values: Partial<CheckPerson> = {}): CheckPerson => ({ id, firstName: id, lastName: 'Kraft', gender: 'UNKNOWN', ...values });
const relation = (id: string, personAId: string, personBId: string, type: string, startDate?: string): CheckRelation => ({
  id,
  personAId,
  personBId,
  type,
  startDate: startDate ? new Date(startDate) : null,
});
const codes = (issues: Issue[]) => issues.map((i) => i.code);
const NOW = new Date('2026-10-21T12:00:00Z');

describe('possible errors of a relation', () => {
  const check = (persons: CheckPerson[], rel: CheckRelation, others: CheckRelation[] = []) => relationIssues(rel, new TreeFacts(persons, others));

  it('finds a man as mother and a woman as husband, but not an unknown gender or a same-sex couple', () => {
    const anna = person('anna', { gender: 'FEMALE' });
    const paul = person('paul', { gender: 'MALE' });
    const eva = person('eva', { gender: 'FEMALE' });
    expect(check([anna, paul], relation('r', 'anna', 'paul', 'MOTHER'))).toEqual([
      { code: 'ROLE_GENDER', personIds: ['paul', 'anna'], relationId: 'r', role: 'MOTHER', gender: 'MALE' },
    ]);
    expect(codes(check([anna, eva], relation('r', 'anna', 'eva', 'HUSBAND')))).toEqual(['ROLE_GENDER']);
    expect(check([anna, eva], relation('r', 'anna', 'eva', 'WIFE'))).toEqual([]);
    expect(check([anna, person('x')], relation('r', 'anna', 'x', 'FATHER'))).toEqual([]);
  });

  it('finds a partner who is a child, a grandchild or a sibling', () => {
    const persons = ['mother', 'son', 'grandson', 'daughter'].map((id) => person(id));
    const family = [relation('1', 'son', 'mother', 'MOTHER'), relation('2', 'grandson', 'son', 'FATHER'), relation('3', 'mother', 'daughter', 'CHILD')];
    const kinship = (a: string, b: string) => check(persons, relation('new', a, b, 'HUSBAND'), family).map((i) => i.kinship);
    expect(kinship('mother', 'son')).toEqual(['PARENT']);
    expect(kinship('mother', 'grandson')).toEqual(['ANCESTOR']);
    expect(kinship('son', 'daughter')).toEqual(['SIBLING']);
    expect(kinship('grandson', 'daughter')).toEqual([]);
  });

  it('counts the parents of a child with the new one', () => {
    const persons = ['child', 'p1', 'p2', 'p3'].map((id) => person(id));
    const parents = [relation('1', 'child', 'p1', 'MOTHER'), relation('2', 'child', 'p2', 'FATHER')];
    expect(check(persons, relation('new', 'p3', 'child', 'CHILD'), parents)).toEqual([{ code: 'TOO_MANY_PARENTS', personIds: ['child'], count: 3 }]);
    expect(check(persons, relation('new', 'child', 'p2', 'FATHER'), parents.slice(0, 1))).toEqual([]);
  });

  it('checks the age and the death of a parent at the birth, with inexact dates only when certain', () => {
    const child = person('child', { birthDate: '10.05.1900' });
    const issues = (parent: Partial<CheckPerson>, type = 'MOTHER') => codes(check([person('parent', parent), child], relation('r', 'child', 'parent', type)));
    expect(issues({ birthDate: '1901' })).toEqual(['CHILD_BORN_BEFORE_PARENT']);
    expect(issues({ birthDate: '11.05.1890' })).toEqual(['PARENT_TOO_YOUNG']);
    // "um 1888" may be 1883: old enough
    expect(issues({ birthDate: 'um 1888' })).toEqual([]);
    expect(issues({ birthDate: 'um 1895' })).toEqual(['PARENT_TOO_YOUNG']);
    expect(issues({ birthDate: '1840' })).toEqual(['MOTHER_TOO_OLD']);
    expect(issues({ birthDate: '1840' }, 'FATHER')).toEqual([]);
    expect(issues({ birthDate: '1870', deathDate: '1899' })).toEqual(['PARENT_DIED_BEFORE_BIRTH']);
    // A father may die before the birth of his child
    expect(issues({ birthDate: '1870', deathDate: '1899' }, 'FATHER')).toEqual([]);
    expect(issues({ birthDate: '1870', deathDate: '1898' }, 'FATHER')).toEqual(['PARENT_DIED_BEFORE_BIRTH']);
    expect(issues({ birthDate: '1870' })).toEqual([]);
  });

  it('finds a partnership that begins before the birth or after the death of a partner', () => {
    const persons = [person('a', { birthDate: '1900', deathDate: '1950' }), person('b', { birthDate: '1905' })];
    expect(codes(check(persons, relation('r', 'a', 'b', 'PARTNER', '1902-06-01')))).toEqual(['PARTNERSHIP_BEFORE_BIRTH']);
    expect(check(persons, relation('r', 'a', 'b', 'PARTNER', '1960-06-01'))).toMatchObject([{ code: 'PARTNERSHIP_AFTER_DEATH', personIds: ['a', 'b'] }]);
    expect(check(persons, relation('r', 'a', 'b', 'PARTNER', '1925-06-01'))).toEqual([]);
  });
});

describe('possible errors of a family tree', () => {
  it('checks dates of persons and events', () => {
    const persons = [
      person('early', { birthDate: '1900', deathDate: '1890' }),
      person('long', { birthDate: '1800', deathDate: '1915' }),
      person('old', { birthDate: '1900' }),
      person('buried', { birthDate: '1900', deathDate: '1950', deathPlace: null }),
    ];
    const events = [
      { id: 'e1', personId: 'buried', title: 'Schule', category: 'SCHOOL_START', date: '1899' },
      { id: 'e2', personId: 'buried', title: 'Umzug', category: 'MOVE', date: '1960' },
      { id: 'e3', personId: 'buried', title: 'Beisetzung', category: 'OTHER', date: '1950' },
      { id: 'e4', personId: 'buried', title: 'Gedenkfeier', category: 'OTHER', date: '1960' },
    ];
    const relations = [relation('r1', 'early', 'long', 'OTHER'), relation('r2', 'old', 'buried', 'OTHER')];
    const issues = treeIssues(persons, relations, events, NOW);
    expect(issues).toEqual([
      { code: 'DEATH_BEFORE_BIRTH', personIds: ['early'] },
      { code: 'LIFESPAN_TOO_LONG', personIds: ['long'], age: 114, inexact: true },
      { code: 'LIVING_TOO_OLD', personIds: ['old'], age: 125, inexact: true },
      { code: 'EVENT_BEFORE_BIRTH', personIds: ['buried'], eventId: 'e1', event: 'Schule' },
      { code: 'EVENT_AFTER_DEATH', personIds: ['buried'], eventId: 'e2', event: 'Umzug' },
    ]);
  });

  it('gives the lowest possible age and says whether the dates leave more than one', () => {
    const persons = [person('exact', { birthDate: '01.01.1900' }), person('about', { birthDate: 'um 1900' })];
    const issues = treeIssues(persons, [relation('r1', 'exact', 'about', 'OTHER')], [], NOW);
    expect(issues).toEqual([
      { code: 'LIVING_TOO_OLD', personIds: ['exact'], age: 126, inexact: false },
      { code: 'LIVING_TOO_OLD', personIds: ['about'], age: 120, inexact: true },
    ]);
  });

  it('lists possible duplicates and cycles once each, but not persons without relation', () => {
    const persons = [
      person('a', { firstName: 'Johann', birthDate: '1900', deathDate: '1970' }),
      person('b', { firstName: 'Johan', birthDate: '1901', deathDate: '1980' }),
      person('c', { firstName: 'Maria' }),
      person('d', { firstName: '(Vorname unbekannt)' }),
      person('e', { firstName: '(Vorname unbekannt)' }),
    ];
    const relations = [relation('1', 'a', 'c', 'CHILD'), relation('2', 'c', 'a', 'CHILD'), relation('3', 'd', 'e', 'SIBLING')];
    const issues = treeIssues(persons, relations, [], NOW);
    expect(issues.filter((i) => i.code !== 'CHILD_BORN_BEFORE_PARENT')).toEqual([
      { code: 'POSSIBLE_DUPLICATE', personIds: ['a', 'b'] },
      { code: 'ANCESTOR_CYCLE', personIds: expect.arrayContaining(['a', 'c']) },
    ]);
  });

  it('counts the parents of each child once', () => {
    const persons = [
      person('child', { firstName: 'Lea' }),
      person('p1', { firstName: 'Anna' }),
      person('p2', { firstName: 'Paul' }),
      person('p3', { firstName: 'Eva' }),
    ];
    const relations = [relation('1', 'child', 'p1', 'MOTHER'), relation('2', 'child', 'p2', 'FATHER'), relation('3', 'p3', 'child', 'CHILD')];
    expect(treeIssues(persons, relations, [], NOW)).toEqual([{ code: 'TOO_MANY_PARENTS', personIds: ['child'], count: 3 }]);
  });

  it('keys an issue by its kind, record and persons, in any order of the persons', () => {
    expect(issueKey({ code: 'POSSIBLE_DUPLICATE', personIds: ['b', 'a'] })).toBe(issueKey({ code: 'POSSIBLE_DUPLICATE', personIds: ['a', 'b'] }));
    expect(issueKey({ code: 'ROLE_GENDER', personIds: ['a', 'b'], relationId: 'r' })).toBe('ROLE_GENDER|r|a,b');
  });
});
