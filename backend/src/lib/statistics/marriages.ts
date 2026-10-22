/**
 * Weddings of a family tree: the start of a marriage (husband or wife), or a life event "wedding" of one of the partners
 * – one wedding per couple and year. Life partners and partners only count with such an event. A wedding event of a person
 * whose partner is not known counts for that person alone.
 */
import { PARTNER_TYPES } from '../../resolvers/relationResolvers.js';
import { yearOf } from './scope.js';
import type { FamilyRelation } from './family.js';

export interface DatedRelation extends FamilyRelation {
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface WeddingEvent {
  personId: string;
  date?: string | null;
}

export interface Marriage {
  /** The partners (one when only one is known) */
  personIds: string[];
  year: number;
}

/** Relations whose start is a wedding; the other partner relations are couples without one */
export const MARRIAGE_TYPES = ['HUSBAND', 'WIFE'];

const pairKey = (ids: string[]) => [...ids].sort().join('|');

export function marriages(relations: DatedRelation[], events: WeddingEvent[], ids: Set<string>): Marriage[] {
  const found = new Map<string, Marriage>();
  const partnersOf = new Map<string, Set<string>>();
  const add = (personIds: string[], year: number) => found.set(`${pairKey(personIds)}#${year}`, { personIds: [...personIds].sort(), year });

  for (const rel of relations) {
    if (!PARTNER_TYPES.includes(rel.type) || !ids.has(rel.personAId) || !ids.has(rel.personBId)) {
      continue;
    }
    partnersOf.set(rel.personAId, (partnersOf.get(rel.personAId) ?? new Set()).add(rel.personBId));
    partnersOf.set(rel.personBId, (partnersOf.get(rel.personBId) ?? new Set()).add(rel.personAId));
    if (rel.startDate && MARRIAGE_TYPES.includes(rel.type)) {
      add([rel.personAId, rel.personBId], rel.startDate.getUTCFullYear());
    }
  }
  const dated = new Set([...found.values()].flatMap((m) => m.personIds.map((id) => `${id}#${m.year}`)));
  for (const event of events) {
    const year = yearOf(event.date);
    if (year === null || !ids.has(event.personId) || dated.has(`${event.personId}#${year}`)) {
      continue;
    }
    // With exactly one partner the wedding is theirs; the partner's own event of that year is then the same wedding
    const partners = [...(partnersOf.get(event.personId) ?? [])];
    add(partners.length === 1 ? [event.personId, partners[0]] : [event.personId], year);
  }
  return [...found.values()];
}

/** The year of the first wedding of every person */
export function firstWeddings(list: Marriage[]): Map<string, number> {
  const first = new Map<string, number>();
  for (const { personIds, year } of list) {
    for (const id of personIds) {
      first.set(id, Math.min(first.get(id) ?? year, year));
    }
  }
  return first;
}
