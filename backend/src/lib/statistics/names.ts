/**
 * First names: the most frequent per gender and the fashion of names per century of birth. Every given name counts
 * (first and middle names, "Johann Georg" → Johann and Georg; a hyphenated name stays one); the placeholder for an
 * unknown first name does not. Spellings are grouped ignoring case, the most frequent one is shown.
 */
import { isUnknownGivenName } from '../transfer/format.js';
import type { Groups } from './groups.js';
import { normalized, yearOf } from './scope.js';

const TOP = 10;
const FASHION_TOP = 3;
const GENDERS = { MALE: 'male', FEMALE: 'female' } as const;
type Gender = (typeof GENDERS)[keyof typeof GENDERS];

export interface NamePerson {
  id: string;
  firstName: string;
  middleName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
}

export interface RankedName {
  label: string;
  count: number;
  filter: string;
}

export interface NameFashion {
  /** First year of the century of birth */
  century: number;
  male: RankedName[];
  female: RankedName[];
}

export interface FirstNames {
  male: RankedName[];
  female: RankedName[];
  fashion: NameFashion[];
}

/** The given names of a person */
export function givenNames(p: Pick<NamePerson, 'firstName' | 'middleName'>): string[] {
  const first = isUnknownGivenName(p.firstName) ? '' : p.firstName;
  return `${first} ${p.middleName ?? ''}`.split(/\s+/).filter(Boolean);
}

/** Names with their persons; the label is the most frequent spelling */
class NameCount {
  private readonly names = new Map<string, { spellings: Map<string, number>; ids: Set<string> }>();
  add(name: string, id: string) {
    const key = normalized(name);
    const entry = this.names.get(key) ?? { spellings: new Map<string, number>(), ids: new Set<string>() };
    entry.spellings.set(name, (entry.spellings.get(name) ?? 0) + 1);
    entry.ids.add(id);
    this.names.set(key, entry);
  }
  top(limit: number, collator: Intl.Collator, filter: (label: string) => string): RankedName[] {
    return [...this.names.values()]
      .map(({ spellings, ids }) => {
        // The most frequent spelling; on a tie the one with a capital letter
        const capital = (s: string) => (s[0] === s[0].toUpperCase() ? 1 : 0);
        const [label] = [...spellings.entries()].sort((a, b) => b[1] - a[1] || capital(b[0]) - capital(a[0]))[0];
        return { label, count: ids.size, filter: filter(label) };
      })
      .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label))
      .slice(0, limit);
  }
}

/** Filters `firstName:<male|female>:<century|all>:<name>` */
export function firstNames(persons: NamePerson[], groups: Groups, collator: Intl.Collator): FirstNames {
  const overall: Record<Gender, NameCount> = { male: new NameCount(), female: new NameCount() };
  const byCentury = new Map<number, Record<Gender, NameCount>>();
  for (const p of persons) {
    const gender = GENDERS[p.gender as keyof typeof GENDERS];
    if (!gender) {
      continue;
    }
    const born = yearOf(p.birthDate);
    const century = born === null ? null : Math.floor(born / 100) * 100;
    if (century !== null && !byCentury.has(century)) {
      byCentury.set(century, { male: new NameCount(), female: new NameCount() });
    }
    for (const name of new Set(givenNames(p))) {
      overall[gender].add(name, p.id);
      groups.add(p.id, 'firstName', `${gender}:all:${name}`);
      if (century !== null) {
        byCentury.get(century)![gender].add(name, p.id);
        groups.add(p.id, 'firstName', `${gender}:${century}:${name}`);
      }
    }
  }
  const link = (gender: Gender, century: number | 'all') => (label: string) => `firstName:${gender}:${century}:${label}`;
  return {
    male: overall.male.top(TOP, collator, link('male', 'all')),
    female: overall.female.top(TOP, collator, link('female', 'all')),
    fashion: [...byCentury.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([century, counts]) => ({
        century,
        male: counts.male.top(FASHION_TOP, collator, link('male', century)),
        female: counts.female.top(FASHION_TOP, collator, link('female', century)),
      })),
  };
}
