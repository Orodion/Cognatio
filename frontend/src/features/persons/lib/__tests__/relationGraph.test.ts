import { describe, expect, it } from 'vitest';
import { relationGraphIds } from '../relationGraph';

// Relation "b is <type> of a" (see the backend): { a: child, b: father, type: 'FATHER' }
const rel = (id: string, personAId: string, personBId: string, type: string) => ({ id, personAId, personBId, type });

const everybody = ['me', 'mama', 'papa', 'oma', 'frau', 'kind', 'enkel', 'schwiegerkind', 'bruder', 'pate', 'fremd'];
const relations = [
  rel('1', 'me', 'papa', 'FATHER'),
  rel('2', 'me', 'mama', 'MOTHER'),
  rel('3', 'mama', 'oma', 'MOTHER'),
  rel('4', 'me', 'frau', 'WIFE'),
  rel('5', 'me', 'kind', 'CHILD'),
  rel('6', 'kind', 'schwiegerkind', 'HUSBAND'),
  rel('7', 'kind', 'enkel', 'CHILD'),
  rel('8', 'me', 'bruder', 'SIBLING'),
  rel('9', 'me', 'pate', 'OTHER'),
];

describe('relationGraphIds', () => {
  it('shows the person, parents, children, partners and everybody directly related – but not grandparents or grandchildren', () => {
    const ids = relationGraphIds('me', everybody, relations);
    expect([...ids].sort()).toEqual(['bruder', 'frau', 'kind', 'mama', 'me', 'papa', 'pate', 'schwiegerkind']);
  });

  it('is empty for an unknown person and ignores relations to persons that do not exist', () => {
    expect(relationGraphIds('nobody', everybody, relations).size).toBe(0);
    expect([...relationGraphIds('me', ['me', 'papa'], relations)].sort()).toEqual(['me', 'papa']);
  });

  it('shows a lone person alone', () => {
    expect([...relationGraphIds('fremd', everybody, relations)]).toEqual(['fremd']);
  });
});
