/**
 * Records of the family tree – of deceased persons only, so a printed page never shows data of living ones. A record that
 * is also a possible error (a mother of 61, a life of 120 years) says so, so a typing error does not stand there unnoticed.
 */
import { MAX_AGE, MAX_MOTHER_AGE, MIN_PARENT_AGE } from '../plausibility/checks.js';
import { buildFamilyIndex, parentRoles, parentSlots, reachable } from './family.js';
import type { DatedRelation, Marriage } from './marriages.js';
import { highest, lowest } from './numbers.js';
import { yearOf } from './scope.js';

/** Holders shown per record; more are counted as ties */
const SHOWN = 3;

export const RECORD_KINDS = [
  'longestLife',
  'longestMarriage',
  'mostChildren',
  'mostCommonChildren',
  'mostPartners',
  'mostDescendants',
  'youngestMother',
  'oldestMother',
  'youngestFather',
  'oldestFather',
  'largestAgeGap',
] as const;
type RecordKind = (typeof RECORD_KINDS)[number];

export interface RecordPerson {
  id: string;
  gender?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
}

export interface FamilyRecord<P> {
  kind: RecordKind;
  /** Years or a number of persons */
  value: number;
  /** The holder (a couple: both); for several holders the first ones */
  persons: P[];
  /** Holders of the same value beyond those shown */
  ties: number;
  possibleError: boolean;
}

interface Candidate {
  ids: string[];
  value: number;
}

const isDeceased = (p: RecordPerson) => !!(p.deathDate?.trim() || p.deathPlace?.trim());

/** `persons`: the scope, `everyone`: the whole family tree (children, partners and parents outside the scope count) */
export function familyRecords<P extends RecordPerson>(persons: P[], everyone: P[], relations: DatedRelation[], weddings: Marriage[]): Array<FamilyRecord<P>> {
  const byId = new Map(everyone.map((p) => [p.id, p]));
  const scope = new Set(persons.map((p) => p.id));
  const deceased = (id: string) => !!byId.get(id) && isDeceased(byId.get(id)!);
  const born = (id: string) => yearOf(byId.get(id)?.birthDate);
  const died = (id: string) => (deceased(id) ? yearOf(byId.get(id)?.deathDate) : null);
  const ids = new Set(everyone.map((p) => p.id));
  const index = buildFamilyIndex(relations, ids);
  const roles = parentRoles(relations, new Map(everyone.map((p) => [p.id, p.gender])));
  const candidates = new Map<RecordKind, Candidate[]>(RECORD_KINDS.map((kind) => [kind, []]));
  const offer = (kind: RecordKind, ids: string[], value: number | null) => {
    // Only deceased holders, at least one of them in the scope
    if (value !== null && ids.every(deceased) && ids.some((id) => scope.has(id))) {
      candidates.get(kind)!.push({ ids, value });
    }
  };

  for (const p of persons) {
    const b = born(p.id);
    const d = died(p.id);
    offer('longestLife', [p.id], b !== null && d !== null && d >= b ? d - b : null);
    offer('mostPartners', [p.id], index.partners.get(p.id)?.size || null);
  }

  // Parents: children per person and per couple, the age at a birth
  const children = new Map<string, number>();
  const common = new Map<string, Candidate>();
  for (const child of everyone) {
    const { father, mother } = parentSlots(roles.get(child.id));
    const childBorn = born(child.id);
    for (const [parent, role] of [
      [father, 'Father'],
      [mother, 'Mother'],
    ] as const) {
      if (!parent) {
        continue;
      }
      children.set(parent, (children.get(parent) ?? 0) + 1);
      const parentBorn = born(parent);
      if (childBorn !== null && parentBorn !== null && childBorn >= parentBorn) {
        offer(`youngest${role}`, [parent], childBorn - parentBorn);
        offer(`oldest${role}`, [parent], childBorn - parentBorn);
      }
    }
    if (father && mother) {
      const key = [father, mother].join('|');
      common.set(key, { ids: [father, mother], value: (common.get(key)?.value ?? 0) + 1 });
    }
  }
  children.forEach((count, parent) => offer('mostChildren', [parent], count));
  common.forEach(({ ids: pair, value }) => offer('mostCommonChildren', pair, value));

  // Couples: the length of the marriage and the age gap; the man first, as in the family sheet
  const rank = (id: string) => ({ MALE: 0, FEMALE: 1 })[byId.get(id)?.gender ?? ''] ?? 2;
  const couples = new Map<string, string[]>();
  const addCouple = (a: string, b: string) =>
    couples.set(
      [a, b].sort().join('|'),
      [a, b].sort().sort((x, y) => rank(x) - rank(y)),
    );
  for (const [a, partners] of index.partners) {
    partners.forEach((b) => addCouple(a, b));
  }
  common.forEach(({ ids: [a, b] }) => addCouple(a, b));
  const weddingYear = new Map<string, number>();
  for (const { personIds, year } of weddings) {
    const key = personIds.join('|');
    weddingYear.set(key, Math.min(weddingYear.get(key) ?? year, year));
  }
  const endYear = new Map<string, number>();
  for (const rel of relations) {
    if (rel.endDate) {
      endYear.set([rel.personAId, rel.personBId].sort().join('|'), rel.endDate.getUTCFullYear());
    }
  }
  for (const [key, pair] of couples) {
    const [a, b] = pair;
    const start = weddingYear.get(key);
    const deaths = [died(a), died(b)].filter((y): y is number => y !== null);
    const end = endYear.get(key) ?? (deaths.length ? Math.min(...deaths) : undefined);
    offer('longestMarriage', pair, start !== undefined && end !== undefined && end >= start ? end - start : null);
    const [bornA, bornB] = [born(a), born(b)];
    offer('largestAgeGap', pair, bornA !== null && bornB !== null ? Math.abs(bornA - bornB) : null);
  }

  // Descendants: the most are with someone whose own parents are not among the candidates
  const deceasedInScope = persons.filter((p) => isDeceased(p)).map((p) => p.id);
  const candidateSet = new Set(deceasedInScope);
  for (const id of deceasedInScope) {
    if (![...(index.parents.get(id) ?? [])].some((parent) => candidateSet.has(parent))) {
      offer('mostDescendants', [id], reachable(id, index.children).size - 1 || null);
    }
  }

  const lowestWins = new Set<RecordKind>(['youngestMother', 'youngestFather']);
  return RECORD_KINDS.flatMap((kind): Array<FamilyRecord<P>> => {
    const list = candidates.get(kind)!;
    if (!list.length) {
      return [];
    }
    const best = (lowestWins.has(kind) ? lowest : highest)(list.map((c) => c.value))!;
    // Each holder once – a mother of twins is offered once per child
    const holders = [...new Map(list.filter((c) => c.value === best).map((c) => [c.ids.join('|'), c])).values()];
    // A couple record shows one couple, a person record up to SHOWN persons
    const shown = holders[0].ids.length > 1 ? holders.slice(0, 1) : holders.slice(0, SHOWN);
    return [
      {
        kind,
        value: best,
        persons: shown.flatMap((c) => c.ids.map((id) => byId.get(id)!)),
        ties: holders.length - shown.length,
        possibleError:
          (kind === 'longestLife' && best > MAX_AGE) ||
          ((kind === 'youngestMother' || kind === 'youngestFather') && best < MIN_PARENT_AGE) ||
          (kind === 'oldestMother' && best > MAX_MOTHER_AGE),
      },
    ];
  });
}
