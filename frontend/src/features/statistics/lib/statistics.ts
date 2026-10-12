import type { Person } from '@/features/persons/types/person';
import { isDeceased } from '@/features/persons/lib/personUtils';
import { parseFlexibleDate } from '@/lib/dateParsing';
import { assignGenerations, buildFamilyIndex, type TreeRelation } from '@/features/tree/lib/treeUtils';

/** Living persons above this age without death data count as "probably deceased" (date of death missing). */
export const MAX_PLAUSIBLE_AGE = 110;
const BUCKET_SIZE = 10;
const LAST_BUCKET = 100;

/** Year of a date (for ranges and approximate dates the start); null if not recognisable. */
export function yearOf(value: string | null | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = parseFlexibleDate(value);
  return parsed.ok ? parsed.value.start.year : null;
}

export interface Bucket {
  /** Lower bound of the age group (0, 10, … 100 = "100+") */
  from: number;
  count: number;
}

export interface Ranked {
  label: string;
  count: number;
}

export interface GenerationRow {
  /** 1 = top generation of a family group */
  generation: number;
  count: number;
  earliestBirth: number | null;
  latestBirth: number | null;
}

export interface Statistics {
  total: number;
  living: number;
  deceased: number;
  male: number;
  female: number;
  unknownGender: number;
  relations: number;
  /** Living persons: current age */
  livingAges: Bucket[];
  /** Verstorbene: erreichtes Alter */
  deathAges: Bucket[];
  /** Without birth year (or death year for deceased persons) – not in the age distribution */
  withoutAge: number;
  /** Above MAX_PLAUSIBLE_AGE but without death data – not in the age distribution */
  probablyDeceased: number;
  averageLifespan: number | null;
  oldestBirth: { year: number; person: Person } | null;
  surnames: Ranked[];
  distinctSurnames: number;
  birthplaces: Ranked[];
  distinctBirthplaces: number;
  withBirthplace: number;
  generations: GenerationRow[];
  /** Family groups: groups connected by relations with at least two persons */
  families: number;
  /** Persons without any relation */
  unconnected: number;
}

function buckets(ages: number[]): Bucket[] {
  const counts = new Map<number, number>();
  for (const age of ages) {
    const from = Math.min(Math.floor(age / BUCKET_SIZE) * BUCKET_SIZE, LAST_BUCKET);
    counts.set(from, (counts.get(from) ?? 0) + 1);
  }
  if (!counts.size) {
    return [];
  }
  // Without gaps from 0 to the highest occupied group so the distribution looks honest
  const max = Math.max(...counts.keys());
  return Array.from({ length: max / BUCKET_SIZE + 1 }, (_, i) => ({ from: i * BUCKET_SIZE, count: counts.get(i * BUCKET_SIZE) ?? 0 }));
}

/** Frequencies ignoring case; the most frequent spelling is shown. Ties are sorted by the rules of `locale` (the language of the UI). */
export function rank(values: Array<string | null | undefined>, limit = 10, locale?: string): { top: Ranked[]; distinct: number; total: number } {
  const groups = new Map<string, Map<string, number>>();
  let total = 0;
  for (const raw of values) {
    const value = raw?.trim().replace(/\s+/g, ' ');
    if (!value) {
      continue;
    }
    total++;
    const key = value.toLowerCase();
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(value, (spellings.get(value) ?? 0) + 1);
    groups.set(key, spellings);
  }
  const ranked = [...groups.values()].map((spellings) => {
    const entries = [...spellings.entries()].sort((a, b) => b[1] - a[1]);
    return { label: entries[0][0], count: entries.reduce((sum, [, n]) => sum + n, 0) };
  });
  ranked.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale));
  return { top: ranked.slice(0, limit), distinct: ranked.length, total };
}

/** All key figures of the statistics page from persons (without the recycle bin) and relations. */
export function computeStatistics(persons: Person[], relations: TreeRelation[], currentYear = new Date().getFullYear(), locale?: string): Statistics {
  const ids = new Set(persons.map((p) => p.id));
  const livingAges: number[] = [];
  const deathAges: number[] = [];
  let withoutAge = 0;
  let probablyDeceased = 0;
  let oldestBirth: Statistics['oldestBirth'] = null;

  for (const p of persons) {
    const born = yearOf(p.birthDate);
    if (born !== null && (!oldestBirth || born < oldestBirth.year)) {
      oldestBirth = { year: born, person: p };
    }
    if (born === null) {
      withoutAge++;
    } else if (isDeceased(p)) {
      const died = yearOf(p.deathDate);
      if (died !== null && died >= born) {
        deathAges.push(died - born);
      } else {
        withoutAge++;
      }
    } else if (currentYear - born > MAX_PLAUSIBLE_AGE) {
      probablyDeceased++;
    } else {
      livingAges.push(Math.max(0, currentYear - born));
    }
  }

  const surnames = rank(
    persons.map((p) => p.lastName),
    10,
    locale,
  );
  const birthplaces = rank(
    persons.map((p) => p.birthPlace),
    10,
    locale,
  );

  // Generationen je Familienverband (oberste Generation = 1)
  const index = buildFamilyIndex(relations, ids);
  const generationOf = assignGenerations(index, ids, null);
  const rows = new Map<number, GenerationRow>();
  for (const p of persons) {
    const generation = (generationOf.get(p.id) ?? 0) + 1;
    const row = rows.get(generation) ?? { generation, count: 0, earliestBirth: null, latestBirth: null };
    row.count++;
    const born = yearOf(p.birthDate);
    if (born !== null) {
      row.earliestBirth = row.earliestBirth === null ? born : Math.min(row.earliestBirth, born);
      row.latestBirth = row.latestBirth === null ? born : Math.max(row.latestBirth, born);
    }
    rows.set(generation, row);
  }

  // Family groups across all relation types
  const seen = new Set<string>();
  let families = 0;
  let unconnected = 0;
  for (const p of persons) {
    if (seen.has(p.id)) {
      continue;
    }
    const stack = [p.id];
    seen.add(p.id);
    let size = 0;
    while (stack.length) {
      const id = stack.pop()!;
      size++;
      for (const n of index.related.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    if (size > 1) {
      families++;
    } else {
      unconnected++;
    }
  }

  return {
    total: persons.length,
    living: persons.filter((p) => !isDeceased(p)).length,
    deceased: persons.filter(isDeceased).length,
    male: persons.filter((p) => p.gender === 'MALE').length,
    female: persons.filter((p) => p.gender === 'FEMALE').length,
    unknownGender: persons.filter((p) => p.gender !== 'MALE' && p.gender !== 'FEMALE').length,
    relations: relations.filter((r) => ids.has(r.personAId) && ids.has(r.personBId)).length,
    livingAges: buckets(livingAges),
    deathAges: buckets(deathAges),
    withoutAge,
    probablyDeceased,
    averageLifespan: deathAges.length ? Math.round(deathAges.reduce((a, b) => a + b, 0) / deathAges.length) : null,
    oldestBirth,
    surnames: surnames.top,
    distinctSurnames: surnames.distinct,
    birthplaces: birthplaces.top,
    distinctBirthplaces: birthplaces.distinct,
    withBirthplace: birthplaces.total,
    generations: [...rows.values()].sort((a, b) => a.generation - b.generation),
    families,
    unconnected,
  };
}
