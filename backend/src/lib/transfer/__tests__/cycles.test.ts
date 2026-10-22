import { ancestorCycles } from '../cycles.js';

const rel = (personAId: string, personBId: string, type: string, active = true) => ({ personAId, personBId, type, active });

describe('ancestorCycles', () => {
  it('finds nothing in an ordinary family', () => {
    expect(ancestorCycles([rel('a', 'c', 'CHILD'), rel('b', 'c', 'CHILD'), rel('a', 'b', 'PARTNER'), rel('d', 'c', 'MOTHER')])).toEqual([]);
  });

  it('finds a person who is their own grandparent, in both recording directions', () => {
    // a → b (CHILD of a), b → c (c has b as FATHER), c → a
    const cycles = ancestorCycles([rel('a', 'b', 'CHILD'), rel('c', 'b', 'FATHER'), rel('c', 'a', 'CHILD'), rel('x', 'a', 'CHILD')]);
    expect(cycles).toHaveLength(1);
    expect([...cycles[0]].sort()).toEqual(['a', 'b', 'c']);
  });

  it('ignores inactive relations and other relation types', () => {
    expect(ancestorCycles([rel('a', 'b', 'CHILD'), rel('b', 'a', 'CHILD', false), rel('b', 'a', 'SIBLING')])).toEqual([]);
  });

  it('reports separate cycles separately', () => {
    const cycles = ancestorCycles([rel('a', 'b', 'CHILD'), rel('b', 'a', 'CHILD'), rel('c', 'd', 'CHILD'), rel('d', 'c', 'CHILD')]);
    expect(cycles.map((c) => [...c].sort())).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('copes with long family lines without recursion', () => {
    const line = Array.from({ length: 50_000 }, (_, i) => rel(`p${i}`, `p${i + 1}`, 'CHILD'));
    expect(ancestorCycles(line)).toEqual([]);
    expect(ancestorCycles([...line, rel('p50000', 'p0', 'CHILD')])[0]).toHaveLength(50_001);
  });
});
