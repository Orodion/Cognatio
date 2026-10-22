/**
 * Births, deaths and weddings per decade – from the earliest to the latest decade with any of them, empty decades
 * included so gaps in the research show.
 */
import type { Groups } from './groups.js';
import type { Marriage } from './marriages.js';
import { yearOf } from './scope.js';

export interface TimelinePerson {
  id: string;
  birthDate?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
}

export interface DecadeRow {
  /** First year of the decade (1880 = 1880–1889) */
  decade: number;
  births: number;
  deaths: number;
  weddings: number;
}

export interface Timeline {
  decades: DecadeRow[];
  /** Persons without a year of birth, deceased persons without a year of death – not on the time axis */
  withoutBirthYear: number;
  withoutDeathYear: number;
}

const decadeOf = (year: number) => Math.floor(year / 10) * 10;

/** Persons by `bornDecade:<decade>`, `diedDecade:<decade>`, `marriedDecade:<decade>` (both partners), `noBirthYear`, `noDeathYear` */
export function timeline(persons: TimelinePerson[], weddings: Marriage[], groups: Groups): Timeline {
  const rows = new Map<number, DecadeRow>();
  const row = (decade: number) => rows.get(decade) ?? rows.set(decade, { decade, births: 0, deaths: 0, weddings: 0 }).get(decade)!;
  const ids = new Set(persons.map((p) => p.id));
  let withoutBirthYear = 0;
  let withoutDeathYear = 0;
  for (const p of persons) {
    const born = yearOf(p.birthDate);
    if (born === null) {
      withoutBirthYear++;
      groups.add(p.id, 'noBirthYear');
    } else {
      row(decadeOf(born)).births++;
      groups.add(p.id, 'bornDecade', decadeOf(born));
    }
    if (p.deathDate?.trim() || p.deathPlace?.trim()) {
      const died = yearOf(p.deathDate);
      if (died === null) {
        withoutDeathYear++;
        groups.add(p.id, 'noDeathYear');
      } else {
        row(decadeOf(died)).deaths++;
        groups.add(p.id, 'diedDecade', decadeOf(died));
      }
    }
  }
  // A wedding counts when one of the partners is in the scope
  for (const wedding of weddings) {
    const inScope = wedding.personIds.filter((id) => ids.has(id));
    if (inScope.length) {
      row(decadeOf(wedding.year)).weddings++;
      inScope.forEach((id) => groups.add(id, 'marriedDecade', decadeOf(wedding.year)));
    }
  }
  if (!rows.size) {
    return { decades: [], withoutBirthYear, withoutDeathYear };
  }
  const first = Math.min(...rows.keys());
  const last = Math.max(...rows.keys());
  const decades = Array.from(
    { length: (last - first) / 10 + 1 },
    (_, i) => rows.get(first + i * 10) ?? { decade: first + i * 10, births: 0, deaths: 0, weddings: 0 },
  );
  return { decades, withoutBirthYear, withoutDeathYear };
}
