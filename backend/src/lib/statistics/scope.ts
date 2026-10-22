/**
 * The part of a family tree the statistics look at: everybody, the ancestors or descendants of a person, the persons of a
 * last name – each optionally only those born in a range of years.
 */
import { parseFlexibleDate } from '../flexibleDate.js';
import { buildFamilyIndex, reachable, type FamilyRelation } from './family.js';

export const SCOPE_KINDS = ['ALL', 'ANCESTORS', 'DESCENDANTS', 'SURNAME'] as const;

export interface StatisticsScope {
  kind?: string | null;
  /** ANCESTORS, DESCENDANTS: the person they start from (included) */
  personId?: string | null;
  /** SURNAME: last name or birth name, ignoring case */
  surname?: string | null;
  /** Year of birth from / to (both included); persons without a year of birth are left out once a bound is given */
  bornFrom?: number | null;
  bornTo?: number | null;
}

export interface ScopePerson {
  id: string;
  lastName?: string | null;
  birthName?: string | null;
  birthDate?: string | null;
}

/** A scope or filter that cannot be used; `reason` is the code the API reports */
export class StatisticsInputError extends Error {
  constructor(
    readonly reason: 'BAD_SCOPE' | 'BAD_FILTER' | 'PERSON_NOT_FOUND',
    message: string,
  ) {
    super(message);
  }
}

/** Text compared ignoring case and repeated spaces */
export const normalized = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';

/** Year of a date (for ranges and approximate dates the start); null if not recognisable */
export function yearOf(value: string | null | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = parseFlexibleDate(value);
  return parsed.ok ? parsed.value.start.year : null;
}

function kindOf(scope: StatisticsScope | null | undefined): (typeof SCOPE_KINDS)[number] {
  const kind = scope?.kind ?? 'ALL';
  if (!(SCOPE_KINDS as readonly string[]).includes(kind)) {
    throw new StatisticsInputError('BAD_SCOPE', `Unknown scope ${kind}.`);
  }
  return kind as (typeof SCOPE_KINDS)[number];
}

/** The persons of the scope, in the order given */
export function selectScope<P extends ScopePerson>(persons: P[], relations: FamilyRelation[], scope?: StatisticsScope | null): P[] {
  const kind = kindOf(scope);
  const { bornFrom, bornTo } = scope ?? {};
  if (bornFrom != null && bornTo != null && bornFrom > bornTo) {
    throw new StatisticsInputError('BAD_SCOPE', 'The first year of birth is after the last one.');
  }
  let selected = persons;
  if (kind === 'ANCESTORS' || kind === 'DESCENDANTS') {
    const personId = scope?.personId ?? '';
    if (!persons.some((p) => p.id === personId)) {
      throw new StatisticsInputError('PERSON_NOT_FOUND', 'The person of the scope is not in this family tree.');
    }
    const index = buildFamilyIndex(relations, new Set(persons.map((p) => p.id)));
    const ids = reachable(personId, kind === 'ANCESTORS' ? index.parents : index.children);
    selected = persons.filter((p) => ids.has(p.id));
  } else if (kind === 'SURNAME') {
    const name = normalized(scope?.surname);
    if (!name) {
      throw new StatisticsInputError('BAD_SCOPE', 'The scope needs a last name.');
    }
    selected = persons.filter((p) => normalized(p.lastName) === name || normalized(p.birthName) === name);
  }
  if (bornFrom == null && bornTo == null) {
    return selected;
  }
  return selected.filter((p) => {
    const year = yearOf(p.birthDate);
    return year !== null && (bornFrom == null || year >= bornFrom) && (bornTo == null || year <= bornTo);
  });
}
