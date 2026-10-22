import type { Person } from '@/features/persons/types/person';
import { isDeceased, MAX_PLAUSIBLE_AGE } from '@/features/persons/lib/personUtils';
import { parseFlexibleDate } from '@/lib/dateParsing';

/** Days ahead the start page looks for anniversaries (today included) */
export const ANNIVERSARY_DAYS = 30;

/**
 * BIRTHDAY: birthday of a living person · BIRTH: birthday of a deceased one · DEATH: day of death · WEDDING: wedding day
 * of a married couple (start of an active relation husband/wife)
 */
export type AnniversaryKind = 'BIRTHDAY' | 'BIRTH' | 'DEATH' | 'WEDDING';

export interface Anniversary {
  kind: AnniversaryKind;
  /** One person, two for a wedding */
  persons: Person[];
  /** Day of the anniversary (local midnight) */
  date: Date;
  /** 0 = today */
  inDays: number;
  /** Years since the event – the age for a birthday */
  years: number;
}

export interface AnniversaryRelation {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  active?: boolean | null;
  startDate?: string | null;
}

interface Day {
  year: number;
  month: number;
  day: number;
}

const MARRIAGE_TYPES = new Set(['HUSBAND', 'WIFE']);
const KIND_ORDER: AnniversaryKind[] = ['BIRTHDAY', 'WEDDING', 'BIRTH', 'DEATH'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Day, month and year of a date of a person – only exact dates have a day to celebrate */
function exactDay(value: string | null | undefined): Day | null {
  const parsed = value?.trim() ? parseFlexibleDate(value, true) : null;
  if (!parsed?.ok || parsed.value.precision !== 'EXACT') {
    return null;
  }
  const { year, month, day } = parsed.value.start;
  return month && day ? { year, month, day } : null;
}

/** Day of the start of a relation: stored as midnight UTC (also as milliseconds in a text) */
function relationDay(value: string | null | undefined): Day | null {
  if (!value) {
    return null;
  }
  const date = new Date(/^\d+$/.test(value) ? Number(value) : value);
  return Number.isNaN(date.getTime()) ? null : { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** The next time the day comes round, from `today` on; 29 February counts as 28 February in other years */
function nextOccurrence(day: Day, today: Date): Date {
  const on = (year: number) => new Date(year, day.month - 1, day.month === 2 && day.day === 29 && !isLeapYear(year) ? 28 : day.day);
  const thisYear = on(today.getFullYear());
  return thisYear < today ? on(today.getFullYear() + 1) : thisYear;
}

/**
 * Anniversaries of the next `days` days (today included), soonest first. Only exact dates count; a person without a
 * date of death who would be older than MAX_PLAUSIBLE_AGE counts as deceased.
 */
export function upcomingAnniversaries(persons: Person[], relations: AnniversaryRelation[], now = new Date(), days = ANNIVERSARY_DAYS): Anniversary[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const found: Anniversary[] = [];
  const add = (kind: AnniversaryKind, people: Person[], day: Day | null) => {
    if (!day) {
      return;
    }
    const date = nextOccurrence(day, today);
    const inDays = Math.round((date.getTime() - today.getTime()) / DAY_MS);
    const years = date.getFullYear() - day.year;
    if (inDays < days && years > 0) {
      found.push({ kind, persons: people, date, inDays, years });
    }
  };

  const byId = new Map(persons.map((person) => [person.id, person]));
  for (const person of persons) {
    const birth = exactDay(person.birthDate);
    const living = !isDeceased(person) && !!birth && today.getFullYear() - birth.year <= MAX_PLAUSIBLE_AGE;
    add(living ? 'BIRTHDAY' : 'BIRTH', [person], birth);
    add('DEATH', [person], exactDay(person.deathDate));
  }

  // A couple may be recorded in both directions – one wedding day per pair
  const couples = new Set<string>();
  for (const relation of relations) {
    const a = byId.get(relation.personAId);
    const b = byId.get(relation.personBId);
    const day = relationDay(relation.startDate);
    const pair = [relation.personAId, relation.personBId].sort().join('|');
    if (!MARRIAGE_TYPES.has(relation.type) || relation.active === false || !a || !b || !day || couples.has(pair)) {
      continue;
    }
    couples.add(pair);
    add('WEDDING', [a, b], day);
  }

  return found.sort((x, y) => x.inDays - y.inDays || KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) || y.years - x.years);
}
