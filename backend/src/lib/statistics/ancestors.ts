/**
 * How far the ancestors of a person are known: per generation the possible ancestors (2ⁿ⁻¹), those found, the persons
 * among them who appear more than once (pedigree collapse) and the "open ends" – ancestors whose father or mother is
 * still missing. Ancestors are counted per place in the pedigree (Kekulé number), as genealogists do; a person reached
 * twice fills two places. At most 15 generations, like the ancestor list of the reports.
 */
import { parentRoles, parentSlots, type FamilyRelation, type Parents } from './family.js';
import { highest, lowest } from './numbers.js';
import { StatisticsInputError, yearOf } from './scope.js';

export const MAX_GENERATIONS = 15;

export interface AncestorPerson {
  id: string;
  gender?: string | null;
  birthDate?: string | null;
}

export interface AncestorGeneration {
  /** 1 = the start person, 2 = parents, 3 = grandparents … */
  generation: number;
  possible: number;
  /** Places of the pedigree filled */
  found: number;
  /** Different persons among them */
  distinct: number;
  /** Persons of this generation whose father or mother is missing */
  openEnds: number;
  earliestBirth: number | null;
  latestBirth: number | null;
  filter: string;
  openEndsFilter: string;
}

export interface AncestorCoverage {
  personId: string;
  generations: AncestorGeneration[];
  /** Places filled from the parents on */
  found: number;
  /** Different persons from the parents on */
  distinct: number;
}

const rolesOf = (persons: AncestorPerson[], relations: FamilyRelation[]) => parentRoles(relations, new Map(persons.map((p) => [p.id, p.gender])));

function parentsOf(roles: Map<string, Parents>, id: string): string[] {
  const { father, mother } = parentSlots(roles.get(id));
  return [father, mother].filter((p): p is string => !!p);
}

/** The persons per generation, each as often as it fills a place */
function walk(roles: Map<string, Parents>, startId: string): string[][] {
  const generations: string[][] = [];
  let current = [startId];
  for (let g = 1; current.length && g <= MAX_GENERATIONS; g++) {
    generations.push(current);
    current = current.flatMap((id) => parentsOf(roles, id));
  }
  return generations;
}

export function ancestorCoverage(persons: AncestorPerson[], relations: FamilyRelation[], startId: string): AncestorCoverage {
  const roles = rolesOf(persons, relations);
  const byId = new Map(persons.map((p) => [p.id, p]));
  const walked = walk(roles, startId);
  const generations = walked.map((ids, i): AncestorGeneration => {
    const generation = i + 1;
    const distinct = [...new Set(ids)];
    const years = distinct.map((id) => yearOf(byId.get(id)?.birthDate)).filter((y): y is number => y !== null);
    return {
      generation,
      possible: 2 ** i,
      found: ids.length,
      distinct: distinct.length,
      openEnds: distinct.filter((id) => parentsOf(roles, id).length < 2).length,
      earliestBirth: lowest(years),
      latestBirth: highest(years),
      filter: `ancestors:${startId}:${generation}`,
      openEndsFilter: `openEnds:${startId}:${generation}`,
    };
  });
  const above = walked.slice(1).flat();
  return { personId: startId, generations, found: above.length, distinct: new Set(above).size };
}

/**
 * The person with the most places in their pedigree within MAX_GENERATIONS (a start when the family tree has no home
 * person). Counted generation by generation for everybody at once: the places within g generations are the person and
 * the places of the parents within g − 1 – so a cycle in the data ends with the last generation, as in `walk`.
 */
export function personWithMostAncestors(persons: AncestorPerson[], relations: FamilyRelation[]): string | null {
  const roles = rolesOf(persons, relations);
  const parents = persons.map((p) => parentsOf(roles, p.id));
  let places = new Map(persons.map((p) => [p.id, 1]));
  for (let g = 2; g <= MAX_GENERATIONS; g++) {
    const previous = places;
    places = new Map(persons.map((p, i) => [p.id, 1 + parents[i].reduce((sum, parent) => sum + (previous.get(parent) ?? 0), 0)]));
  }
  let best: string | null = null;
  let most = 0;
  for (const p of persons) {
    const n = places.get(p.id)!;
    if (n > most) {
      best = p.id;
      most = n;
    }
  }
  return best;
}

export const ANCESTOR_FILTER_KINDS = ['ancestors', 'openEnds'] as const;

/** The persons behind `ancestors:<person>:<generation>` or `openEnds:<person>:<generation>`, in the order given */
export function ancestorPersons<P extends AncestorPerson>(persons: P[], relations: FamilyRelation[], filter: string): P[] {
  const match = /^(ancestors|openEnds):(.+):(\d{1,2})$/.exec(filter);
  if (!match || !persons.some((p) => p.id === match[2])) {
    throw new StatisticsInputError('BAD_FILTER', `Unknown filter ${filter}.`);
  }
  const [, kind, startId, generation] = match;
  const roles = rolesOf(persons, relations);
  const ids = new Set(walk(roles, startId)[Number(generation) - 1] ?? []);
  const wanted = kind === 'openEnds' ? new Set([...ids].filter((id) => parentsOf(roles, id).length < 2)) : ids;
  return persons.filter((p) => wanted.has(p.id));
}
