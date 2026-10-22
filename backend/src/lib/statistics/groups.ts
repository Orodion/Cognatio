/**
 * The filters of the statistics: every figure that stands for persons names a filter (e.g. `surname:Kraft`), and the
 * pass that counts the persons collects them under its key. A key compares its value ignoring case.
 */
import { StatisticsInputError, normalized } from './scope.js';

/** Kinds of filters; those in VALUE_KINDS need a value after the colon */
export const FILTER_KINDS = [
  'all',
  'gender',
  'deceased',
  'living',
  'livingAge',
  'deathAge',
  'lifespan',
  'withoutAge',
  'probablyDeceased',
  'surname',
  'birthplace',
  'generation',
  'family',
  'unconnected',
  'missing',
  'bornDecade',
  'diedDecade',
  'marriedDecade',
  'noBirthYear',
  'noDeathYear',
  'lives',
  'children',
  'ageGap',
  'firstName',
  'stayed',
  'move',
  'place',
] as const;
export type FilterKind = (typeof FILTER_KINDS)[number];
const VALUE_KINDS: readonly FilterKind[] = [
  'gender',
  'livingAge',
  'deathAge',
  'surname',
  'birthplace',
  'generation',
  'missing',
  'bornDecade',
  'diedDecade',
  'marriedDecade',
  'lives',
  'children',
  'ageGap',
  'firstName',
  'stayed',
  'move',
  'place',
];

/** The key a filter is stored under: the kind and the value compared ignoring case */
const keyOf = (kind: FilterKind, value?: string | number) => (value === undefined ? kind : `${kind}:${normalized(String(value))}`);

/** The key of a filter as the API receives it; refuses unknown kinds and missing values */
export function filterKey(filter: string): string {
  const colon = filter.indexOf(':');
  const kind = (colon < 0 ? filter : filter.slice(0, colon)) as FilterKind;
  const value = colon < 0 ? undefined : filter.slice(colon + 1);
  if (!FILTER_KINDS.includes(kind) || VALUE_KINDS.includes(kind) !== (value !== undefined) || (value !== undefined && !normalized(value))) {
    throw new StatisticsInputError('BAD_FILTER', `Unknown filter ${filter}.`);
  }
  return keyOf(kind, value);
}

/** Persons collected per filter key */
export class Groups {
  readonly members = new Map<string, Set<string>>();
  add(id: string, kind: FilterKind, value?: string | number) {
    const key = keyOf(kind, value);
    const set = this.members.get(key);
    if (set) {
      set.add(id);
    } else {
      this.members.set(key, new Set([id]));
    }
  }
  /** Different persons under a key */
  size(kind: FilterKind, value?: string | number) {
    return this.members.get(keyOf(kind, value))?.size ?? 0;
  }
}
