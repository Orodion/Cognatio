import type { Person } from '@/features/persons/types/person';
import type { Family, PartnerLink } from './family';

/** Generations a list goes back or down at most */
export const MAX_GENERATIONS = 15;

export interface AncestorEntry {
  /** Kekulé number: the starting person 1, the father of n 2n, the mother 2n + 1 */
  number: number;
  person: Person;
  /** The person appears earlier with this number (pedigree collapse) – their ancestors are listed there */
  seeNumber?: number;
}

export interface AncestorGeneration {
  /** 1 = the starting person, 2 = parents, 3 = grandparents … */
  generation: number;
  entries: AncestorEntry[];
}

/**
 * Ancestor list with Kekulé numbers, generation by generation. A person reached a second time (pedigree collapse) is
 * listed with a reference to the first number and not followed again – this also stops on contradictory data.
 */
export function ancestorList(family: Family, rootId: string, generations = MAX_GENERATIONS): AncestorGeneration[] {
  const root = family.persons.get(rootId);
  if (!root) {
    return [];
  }
  const firstNumber = new Map<string, number>();
  const result: AncestorGeneration[] = [];
  let current: Array<{ number: number; person: Person }> = [{ number: 1, person: root }];
  for (let generation = 1; current.length > 0 && generation <= generations; generation++) {
    const entries: AncestorEntry[] = [];
    const next: Array<{ number: number; person: Person }> = [];
    for (const { number, person } of current) {
      const seen = firstNumber.get(person.id);
      if (seen !== undefined) {
        entries.push({ number, person, seeNumber: seen });
        continue;
      }
      firstNumber.set(person.id, number);
      entries.push({ number, person });
      const { father, mother } = family.fatherAndMother(person.id);
      if (father) {
        next.push({ number: 2 * number, person: father });
      }
      if (mother) {
        next.push({ number: 2 * number + 1, person: mother });
      }
    }
    result.push({ generation, entries });
    current = next.sort((a, b) => a.number - b.number);
  }
  return result;
}

export interface DescendantEntry {
  /** d'Aboville number: 1, 1.1, 1.1.2 … */
  number: string;
  /** 0 = the starting person */
  depth: number;
  person: Person;
  partners: PartnerLink[];
  /** The person appears earlier with this number (both parents descend from the starting person) */
  seeNumber?: string;
}

/**
 * Descendant list with d'Aboville numbers, depth first: each person, their partners, then their children by date of
 * birth. A person reached a second time is listed with a reference and not followed again.
 */
export function descendantList(family: Family, rootId: string, generations = MAX_GENERATIONS): DescendantEntry[] {
  const root = family.persons.get(rootId);
  if (!root) {
    return [];
  }
  const firstNumber = new Map<string, string>();
  const result: DescendantEntry[] = [];
  const visit = (person: Person, number: string, depth: number) => {
    const seen = firstNumber.get(person.id);
    if (seen !== undefined) {
      result.push({ number, depth, person, partners: [], seeNumber: seen });
      return;
    }
    firstNumber.set(person.id, number);
    result.push({ number, depth, person, partners: family.partners(person.id) });
    if (depth + 1 >= generations) {
      return;
    }
    family.children(person.id).forEach((child, i) => visit(child, `${number}.${i + 1}`, depth + 1));
  };
  visit(root, '1', 0);
  return result;
}

const ROMAN: Array<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Roman numeral of a generation (1 → I, 14 → XIV) */
export function roman(value: number): string {
  let rest = value;
  let text = '';
  for (const [amount, letters] of ROMAN) {
    while (rest >= amount) {
      text += letters;
      rest -= amount;
    }
  }
  return text;
}
