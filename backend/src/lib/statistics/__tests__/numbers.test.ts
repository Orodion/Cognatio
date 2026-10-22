import { buildFamilyIndex, generations } from '../family.js';
import { highest, lowest } from '../numbers.js';

/** More values than `Math.min(...values)` can take */
const MANY = 300_000;

describe('lowest and highest', () => {
  it('find the extremes of any number of values', () => {
    const values = Array.from({ length: MANY }, (_, i) => (i * 7919) % MANY);
    expect([lowest(values), highest(values)]).toEqual([0, MANY - 1]);
    expect([lowest([3, -2, 5]), highest([3, -2, 5])]).toEqual([-2, 5]);
    expect([lowest([]), highest([])]).toEqual([null, null]);
  });

  it('let the generations of a very large family group be counted', () => {
    // A line of fathers and sons as long as a large family tree
    const ids = Array.from({ length: MANY }, (_, i) => `p${i}`);
    const relations = ids.slice(1).map((id, i) => ({ personAId: id, personBId: ids[i], type: 'FATHER' }));
    const generation = generations(buildFamilyIndex(relations, new Set(ids)), ids);
    expect([generation.get(ids[0]), generation.get(ids[MANY - 1])]).toEqual([1, MANY]);
  });
});
