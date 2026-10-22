/**
 * Lookups of a family tree for the statistics: parents, children and partners per person, the persons reached from one
 * person, the generations per family group and the family groups themselves. Safe against cycles.
 */
import { PARTNER_TYPES, parentChildOf } from '../../resolvers/relationResolvers.js';
import { lowest } from './numbers.js';

export interface FamilyRelation {
  personAId: string;
  personBId: string;
  type: string;
}

export interface FamilyIndex {
  parents: Map<string, Set<string>>;
  children: Map<string, Set<string>>;
  partners: Map<string, Set<string>>;
  /** All directly connected persons, regardless of the relation type */
  related: Map<string, Set<string>>;
}

function addTo(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

/** Lookups for the relations between persons in `ids` (relations to other persons are left out) */
export function buildFamilyIndex(relations: FamilyRelation[], ids: Set<string>): FamilyIndex {
  const index: FamilyIndex = { parents: new Map(), children: new Map(), partners: new Map(), related: new Map() };
  for (const rel of relations) {
    if (!ids.has(rel.personAId) || !ids.has(rel.personBId)) {
      continue;
    }
    addTo(index.related, rel.personAId, rel.personBId);
    addTo(index.related, rel.personBId, rel.personAId);
    const pc = parentChildOf(rel);
    if (pc) {
      addTo(index.children, pc.parentId, pc.childId);
      addTo(index.parents, pc.childId, pc.parentId);
    } else if (PARTNER_TYPES.includes(rel.type)) {
      addTo(index.partners, rel.personAId, rel.personBId);
      addTo(index.partners, rel.personBId, rel.personAId);
    }
  }
  return index;
}

/** The person and everybody reached along `next` (parents: the ancestors, children: the descendants) */
export function reachable(start: string, next: Map<string, Set<string>>): Set<string> {
  const found = new Set([start]);
  const stack = [start];
  while (stack.length) {
    for (const n of next.get(stack.pop()!) ?? []) {
      if (!found.has(n)) {
        found.add(n);
        stack.push(n);
      }
    }
  }
  return found;
}

/** The family groups: persons connected by any relations; a person without relations is a group of one */
export function familyGroups(index: FamilyIndex, ids: Iterable<string>): string[][] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      const group = [...reachable(id, index.related)];
      group.forEach((member) => seen.add(member));
      groups.push(group);
    }
  }
  return groups;
}

/**
 * Generation of every person within its family group, 1 = the top generation (parents one above, children one below,
 * partners the same). With contradictory data the first assignment found wins.
 */
export function generations(index: FamilyIndex, ids: Iterable<string>): Map<string, number> {
  const generation = new Map<string, number>();
  for (const start of ids) {
    if (generation.has(start)) {
      continue;
    }
    generation.set(start, 0);
    const group = [start];
    for (let i = 0; i < group.length; i++) {
      const id = group[i];
      const g = generation.get(id)!;
      const neighbours: Array<[Set<string> | undefined, number]> = [
        [index.parents.get(id), g - 1],
        [index.children.get(id), g + 1],
        [index.partners.get(id), g],
      ];
      for (const [set, value] of neighbours) {
        for (const n of set ?? []) {
          if (!generation.has(n)) {
            generation.set(n, value);
            group.push(n);
          }
        }
      }
    }
    const top = lowest(group.map((id) => generation.get(id)!))!;
    for (const id of group) {
      generation.set(id, generation.get(id)! - top + 1);
    }
  }
  return generation;
}

export interface Parents {
  father?: string;
  mother?: string;
  /** Parents whose role is not known (a parent by a CHILD relation without a gender) */
  others: string[];
}

/**
 * Father and mother of every person: by the relation (MOTHER, FATHER), otherwise by the gender of the parent. A parent
 * of unknown role fills a missing father or mother (`slots`), so it is not counted as missing.
 */
export function parentRoles(relations: FamilyRelation[], genderOf: Map<string, string | null | undefined>): Map<string, Parents> {
  const roles = new Map<string, Parents>();
  for (const rel of relations) {
    const pc = parentChildOf(rel);
    if (!pc || !genderOf.has(pc.parentId) || !genderOf.has(pc.childId)) {
      continue;
    }
    const parents = roles.get(pc.childId) ?? { others: [] };
    const gender = genderOf.get(pc.parentId);
    const role =
      rel.type === 'FATHER' || (rel.type !== 'MOTHER' && gender === 'MALE') ? 'father' : rel.type === 'MOTHER' || gender === 'FEMALE' ? 'mother' : null;
    if (role && !parents[role]) {
      parents[role] = pc.parentId;
    } else if (pc.parentId !== parents.father && pc.parentId !== parents.mother && !parents.others.includes(pc.parentId)) {
      parents.others.push(pc.parentId);
    }
    roles.set(pc.childId, parents);
  }
  return roles;
}

/** The parents of a person as father and mother slots: a parent of unknown role takes a free slot */
export function parentSlots(parents: Parents | undefined): { father?: string; mother?: string } {
  if (!parents) {
    return {};
  }
  const others = [...parents.others];
  return { father: parents.father ?? others.shift(), mother: parents.mother ?? others.shift() };
}
