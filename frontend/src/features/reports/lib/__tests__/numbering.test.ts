import { describe, it, expect } from 'vitest';
import { makePerson } from '@/test/fixtures';
import { buildFamily, type ReportRelation } from '../family';
import { ancestorList, descendantList, roman } from '../numbering';

const male = (id: string, birthDate: string | null = null) => makePerson({ id, firstName: id, gender: 'MALE', birthDate });
const female = (id: string, birthDate: string | null = null) => makePerson({ id, firstName: id, gender: 'FEMALE', birthDate });
let n = 0;
// "personB is <type> of personA"
const rel = (a: string, type: string, b: string, extra: Partial<ReportRelation> = {}): ReportRelation => ({
  id: `r${n++}`,
  personAId: a,
  personBId: b,
  type,
  active: true,
  ...extra,
});

describe('buildFamily', () => {
  it('reads parents, children, partners and siblings from relations in both directions', () => {
    const family = buildFamily(
      [male('dad'), female('mum'), male('kid', '1990'), female('kid2', '1985'), male('half', '1980')],
      [
        rel('kid', 'FATHER', 'dad'),
        rel('mum', 'CHILD', 'kid'),
        rel('kid2', 'MOTHER', 'mum'),
        rel('dad', 'WIFE', 'mum', { startDate: '1984-05-01T00:00:00.000Z' }),
        rel('kid', 'SIBLING', 'half'),
        rel('kid', 'OTHER', 'mum'),
        rel('kid', 'FATHER', 'gone'),
        rel('kid2', 'FATHER', 'dad', { active: false }),
      ],
    );
    expect(family.fatherAndMother('kid')).toEqual({ father: expect.objectContaining({ id: 'dad' }), mother: expect.objectContaining({ id: 'mum' }) });
    expect(family.fatherAndMother('kid2')).toEqual({ father: null, mother: expect.objectContaining({ id: 'mum' }) });
    expect(family.children('mum').map((p) => p.id)).toEqual(['kid2', 'kid']);
    expect(family.childrenOf('dad', 'mum').map((p) => p.id)).toEqual(['kid']);
    expect(family.partners('mum').map((p) => p.person.id)).toEqual(['dad']);
    expect(family.siblings('kid').map((p) => p.id)).toEqual(['half', 'kid2']);
  });

  it('puts parents of unknown gender into the free place', () => {
    const family = buildFamily(
      [male('kid'), makePerson({ id: 'p1', gender: 'UNKNOWN' }), female('p2')],
      [rel('kid', 'CHILD', 'x'), rel('p1', 'CHILD', 'kid'), rel('p2', 'CHILD', 'kid')],
    );
    expect(family.fatherAndMother('kid')).toEqual({ father: expect.objectContaining({ id: 'p1' }), mother: expect.objectContaining({ id: 'p2' }) });
  });
});

describe('ancestorList', () => {
  const persons = [male('me'), male('f'), female('m'), male('ff'), female('fm'), male('mf'), female('mm')];
  const relations = [
    rel('me', 'FATHER', 'f'),
    rel('me', 'MOTHER', 'm'),
    rel('f', 'FATHER', 'ff'),
    rel('f', 'MOTHER', 'fm'),
    rel('m', 'FATHER', 'mf'),
    rel('m', 'MOTHER', 'mm'),
  ];

  it('numbers the ancestors after Kekulé, generation by generation', () => {
    const list = ancestorList(buildFamily(persons, relations), 'me');
    expect(list.map((g) => [g.generation, g.entries.map((e) => `${e.number}:${e.person.id}`)])).toEqual([
      [1, ['1:me']],
      [2, ['2:f', '3:m']],
      [3, ['4:ff', '5:fm', '6:mf', '7:mm']],
    ]);
  });

  it('stops at the chosen number of generations and leaves gaps for unknown parents', () => {
    expect(ancestorList(buildFamily(persons, relations), 'me', 2).map((g) => g.generation)).toEqual([1, 2]);
    const withoutFather = ancestorList(buildFamily(persons, relations.slice(1)), 'me');
    expect(withoutFather.map((g) => g.entries.map((e) => e.number))).toEqual([[1], [3], [6, 7]]);
  });

  it('refers to the first number on pedigree collapse and does not follow the person again', () => {
    // The parents are cousins: both grandmothers are sisters with the same mother "gg"
    const extra = [female('gg'), ...persons];
    const list = ancestorList(buildFamily(extra, [...relations, rel('fm', 'MOTHER', 'gg'), rel('mm', 'MOTHER', 'gg')]), 'me');
    expect(list[3].entries).toEqual([
      expect.objectContaining({ number: 11, person: expect.objectContaining({ id: 'gg' }) }),
      expect.objectContaining({ number: 15, seeNumber: 11 }),
    ]);
    expect(list).toHaveLength(4);
  });

  it('survives a cycle in the data and returns nothing for an unknown person', () => {
    const cycle = buildFamily([male('a'), male('b')], [rel('a', 'FATHER', 'b'), rel('b', 'FATHER', 'a')]);
    expect(ancestorList(cycle, 'a').map((g) => g.entries.map((e) => [e.number, e.seeNumber]))).toEqual([[[1, undefined]], [[2, undefined]], [[4, 1]]]);
    expect(ancestorList(cycle, 'nobody')).toEqual([]);
  });
});

describe('descendantList', () => {
  it('numbers the descendants after d’Aboville, children by date of birth, with their partners', () => {
    const family = buildFamily(
      [male('root'), female('wife'), male('older', '1950'), female('younger', '1955'), male('grandchild'), female('inlaw')],
      [
        rel('root', 'WIFE', 'wife'),
        rel('younger', 'FATHER', 'root'),
        rel('older', 'FATHER', 'root'),
        rel('older', 'WIFE', 'inlaw'),
        rel('grandchild', 'FATHER', 'older'),
      ],
    );
    const list = descendantList(family, 'root');
    expect(list.map((e) => `${e.number} ${e.person.id} ${e.depth} [${e.partners.map((p) => p.person.id)}]`)).toEqual([
      '1 root 0 [wife]',
      '1.1 older 1 [inlaw]',
      '1.1.1 grandchild 2 []',
      '1.2 younger 1 []',
    ]);
    expect(descendantList(family, 'root', 2).map((e) => e.number)).toEqual(['1', '1.1', '1.2']);
  });

  it('refers to the first number when a descendant appears twice', () => {
    // A child of two descendants (cousins)
    const family = buildFamily(
      [male('root'), male('a'), female('b'), male('c'), female('d'), male('kid')],
      [
        rel('a', 'FATHER', 'root'),
        rel('b', 'FATHER', 'root'),
        rel('c', 'FATHER', 'a'),
        rel('d', 'MOTHER', 'b'),
        rel('kid', 'FATHER', 'c'),
        rel('kid', 'MOTHER', 'd'),
      ],
    );
    const kids = descendantList(family, 'root').filter((e) => e.person.id === 'kid');
    expect(kids.map((e) => [e.number, e.seeNumber])).toEqual([
      ['1.1.1.1', undefined],
      ['1.2.1.1', '1.1.1.1'],
    ]);
  });
});

describe('roman', () => {
  it('writes generations as Roman numerals', () => {
    expect([1, 4, 9, 14, 15].map(roman)).toEqual(['I', 'IV', 'IX', 'XIV', 'XV']);
  });
});
