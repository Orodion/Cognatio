/**
 * The figures of the page "Statistics". Every figure that stands for persons comes with a filter (e.g.
 * `surname:Kraft`); the same pass that counts the persons also collects them under that filter, so a number and the
 * list behind it can never disagree. `personsOf` reads such a list.
 */
import { MAX_AGE } from '../plausibility/checks.js';
import { collatorFor } from '../search/search.js';
import { buildFamilyIndex, familyGroups, generations, parentRoles, parentSlots, type FamilyRelation } from './family.js';
import { normalized, yearOf, type ScopePerson } from './scope.js';
import { Groups, filterKey } from './groups.js';
import { marriages, type DatedRelation, type WeddingEvent } from './marriages.js';
import { timeline, type Timeline } from './timeline.js';
import { lives, type Lives } from './lives.js';
import { firstNames, type FirstNames } from './names.js';
import { migration, type Migration, type PlaceEvent } from './migration.js';
import { familyRecords, type FamilyRecord } from './records.js';

export { FILTER_KINDS, filterKey } from './groups.js';

const BUCKET_SIZE = 10;
const LAST_BUCKET = 100;
const TOP = 10;

export interface StatPerson extends ScopePerson {
  firstName: string;
  gender?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  birthPlace?: string | null;
}

export interface Bucket {
  /** Lower bound of the age group (0, 10, … 100 = "100+") */
  from: number;
  count: number;
  filter: string;
}

export interface Ranked {
  label: string;
  count: number;
  filter: string;
}

export interface GenerationRow {
  /** 1 = top generation of a family group */
  generation: number;
  count: number;
  earliestBirth: number | null;
  latestBirth: number | null;
  filter: string;
}

/** Facts whose share is shown under "What is still missing?" */
export const COMPLETENESS_FACTS = ['birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'father', 'mother', 'partner', 'photo', 'source'] as const;
type Fact = (typeof COMPLETENESS_FACTS)[number];

export interface CompletenessRow {
  fact: Fact;
  /** Persons the fact applies to (e.g. a date of death only for the deceased) */
  total: number;
  present: number;
  missing: number;
  /** The persons without the fact */
  filter: string;
}

export interface Completeness {
  rows: CompletenessRow[];
  /** Mean share of the rows that apply to anybody, 0–1; null without persons */
  score: number | null;
}

/** Below this age at death nobody is expected to have had a partner */
const PARTNER_AGE = 18;

export interface Statistics<P> {
  total: number;
  living: number;
  deceased: number;
  male: number;
  female: number;
  unknownGender: number;
  relations: number;
  /** Living persons: current age */
  livingAges: Bucket[];
  /** Deceased persons: age reached */
  deathAges: Bucket[];
  /** Without birth year (or death year for deceased persons) – not in the age distribution */
  withoutAge: number;
  /** Above MAX_AGE but without death data – not in the age distribution */
  probablyDeceased: number;
  averageLifespan: number | null;
  oldestBirth: { year: number; person: P } | null;
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
  completeness: Completeness;
  timeline: Timeline;
  lives: Lives;
  firstNames: FirstNames;
  migration: Migration;
  records: Array<FamilyRecord<P>>;
}

const isDeceased = (p: StatPerson) => !!(p.deathDate?.trim() || p.deathPlace?.trim());

/** Age groups without gaps from 0 to the highest occupied one, so the distribution looks honest */
function buckets(groups: Groups, kind: 'livingAge' | 'deathAge'): Bucket[] {
  const used = [...groups.members.keys()].filter((k) => k.startsWith(`${kind}:`)).map((k) => Number(k.slice(kind.length + 1)));
  if (!used.length) {
    return [];
  }
  return Array.from({ length: Math.max(...used) / BUCKET_SIZE + 1 }, (_, i) => {
    const from = i * BUCKET_SIZE;
    return { from, count: groups.size(kind, from), filter: `${kind}:${from}` };
  });
}

/** Frequencies ignoring case; the most frequent spelling is shown. Ties are sorted by the rules of the language. */
function rank(groups: Groups, kind: 'surname' | 'birthplace', values: Array<[id: string, value: string | null | undefined]>, collator: Intl.Collator) {
  const spellings = new Map<string, Map<string, number>>();
  let total = 0;
  for (const [id, raw] of values) {
    const value = raw?.trim().replace(/\s+/g, ' ');
    if (!value) {
      continue;
    }
    total++;
    groups.add(id, kind, value);
    const counts = spellings.get(normalized(value)) ?? new Map<string, number>();
    counts.set(value, (counts.get(value) ?? 0) + 1);
    spellings.set(normalized(value), counts);
  }
  const ranked = [...spellings.values()].map((counts) => {
    const [label] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { label, count: [...counts.values()].reduce((sum, n) => sum + n, 0), filter: `${kind}:${label}` };
  });
  ranked.sort((a, b) => b.count - a.count || collator.compare(a.label, b.label));
  return { top: ranked.slice(0, TOP), distinct: ranked.length, total };
}

function ages<P extends StatPerson>(persons: P[], groups: Groups, currentYear: number) {
  let oldestBirth: Statistics<P>['oldestBirth'] = null;
  const lifespans: number[] = [];
  for (const p of persons) {
    const born = yearOf(p.birthDate);
    if (born !== null && (!oldestBirth || born < oldestBirth.year)) {
      oldestBirth = { year: born, person: p };
    }
    const died = isDeceased(p) ? yearOf(p.deathDate) : null;
    if (born === null || (isDeceased(p) && (died === null || died < born))) {
      groups.add(p.id, 'withoutAge');
    } else if (died !== null) {
      lifespans.push(died - born);
      groups.add(p.id, 'lifespan');
      groups.add(p.id, 'deathAge', Math.min(Math.floor((died - born) / BUCKET_SIZE) * BUCKET_SIZE, LAST_BUCKET));
    } else if (currentYear - born > MAX_AGE) {
      groups.add(p.id, 'probablyDeceased');
    } else {
      groups.add(p.id, 'livingAge', Math.min(Math.floor(Math.max(0, currentYear - born) / BUCKET_SIZE) * BUCKET_SIZE, LAST_BUCKET));
    }
  }
  const averageLifespan = lifespans.length ? Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length) : null;
  return { oldestBirth, averageLifespan };
}

function generationRows<P extends StatPerson>(persons: P[], relations: FamilyRelation[], groups: Groups) {
  const index = buildFamilyIndex(relations, new Set(persons.map((p) => p.id)));
  const generationOf = generations(
    index,
    persons.map((p) => p.id),
  );
  const rows = new Map<number, GenerationRow>();
  for (const p of persons) {
    const generation = generationOf.get(p.id) ?? 1;
    groups.add(p.id, 'generation', generation);
    const row = rows.get(generation) ?? { generation, count: 0, earliestBirth: null, latestBirth: null, filter: `generation:${generation}` };
    const born = yearOf(p.birthDate);
    rows.set(generation, {
      ...row,
      count: row.count + 1,
      earliestBirth: born === null ? row.earliestBirth : Math.min(row.earliestBirth ?? born, born),
      latestBirth: born === null ? row.latestBirth : Math.max(row.latestBirth ?? born, born),
    });
  }
  let families = 0;
  for (const group of familyGroups(
    index,
    persons.map((p) => p.id),
  )) {
    families += group.length > 1 ? 1 : 0;
    group.forEach((id) => groups.add(id, group.length > 1 ? 'family' : 'unconnected'));
  }
  return { generations: [...rows.values()].sort((a, b) => a.generation - b.generation), families };
}

export interface CompletenessContext {
  /** All persons of the family tree – parents and partners outside the scope count too */
  everyone?: StatPerson[];
  /** Persons with a profile picture or a medium (of their own or linked with one of their events) */
  withMedia?: Set<string>;
  /** Persons with a citation of the person, its events or relations */
  cited?: Set<string>;
  /** Life events "wedding" (for weddings without a start date of the marriage) */
  weddingEvents?: WeddingEvent[];
  /** Life events with a place (the places of a person, moves) */
  placeEvents?: PlaceEvent[];
}

function completeness(persons: StatPerson[], relations: FamilyRelation[], groups: Groups, context: CompletenessContext): Completeness {
  const everyone = context.everyone ?? persons;
  const roles = parentRoles(relations, new Map(everyone.map((p) => [p.id, p.gender])));
  const partners = buildFamilyIndex(relations, new Set(everyone.map((p) => p.id))).partners;
  const totals = new Map<Fact, number>(COMPLETENESS_FACTS.map((fact) => [fact, 0]));
  const present = new Map<Fact, number>(COMPLETENESS_FACTS.map((fact) => [fact, 0]));
  const count = (p: StatPerson, fact: Fact, has: boolean) => {
    totals.set(fact, totals.get(fact)! + 1);
    if (has) {
      present.set(fact, present.get(fact)! + 1);
    } else {
      groups.add(p.id, 'missing', fact);
    }
  };
  for (const p of persons) {
    const parents = parentSlots(roles.get(p.id));
    count(p, 'birthDate', !!p.birthDate?.trim());
    count(p, 'birthPlace', !!p.birthPlace?.trim());
    if (isDeceased(p)) {
      count(p, 'deathDate', !!p.deathDate?.trim());
      count(p, 'deathPlace', !!p.deathPlace?.trim());
      const born = yearOf(p.birthDate);
      const died = yearOf(p.deathDate);
      if (born === null || died === null || died - born >= PARTNER_AGE) {
        count(p, 'partner', !!partners.get(p.id)?.size);
      }
    }
    count(p, 'father', !!parents.father);
    count(p, 'mother', !!parents.mother);
    count(p, 'photo', !!context.withMedia?.has(p.id));
    count(p, 'source', !!context.cited?.has(p.id));
  }
  const rows = COMPLETENESS_FACTS.map((fact) => ({
    fact,
    total: totals.get(fact)!,
    present: present.get(fact)!,
    missing: totals.get(fact)! - present.get(fact)!,
    filter: `missing:${fact}`,
  }));
  const shares = rows.filter((r) => r.total > 0).map((r) => r.present / r.total);
  return { rows, score: shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null };
}

export interface StatisticsResult<P> {
  statistics: Statistics<P>;
  /** The persons per filter key, in the order of the persons given */
  groups: Map<string, Set<string>>;
}

/** All figures of the persons given (the scope) and the relations between them */
export function computeStatistics<P extends StatPerson>(
  persons: P[],
  relations: DatedRelation[],
  { currentYear = new Date().getFullYear(), language, ...context }: { currentYear?: number; language?: string | null } & CompletenessContext = {},
): StatisticsResult<P> {
  const groups = new Groups();
  const ids = new Set(persons.map((p) => p.id));
  const between = relations.filter((r) => ids.has(r.personAId) && ids.has(r.personBId));
  for (const p of persons) {
    groups.add(p.id, 'all');
    groups.add(p.id, isDeceased(p) ? 'deceased' : 'living');
    groups.add(p.id, 'gender', p.gender === 'MALE' || p.gender === 'FEMALE' ? p.gender : 'UNKNOWN');
  }
  const { oldestBirth, averageLifespan } = ages(persons, groups, currentYear);
  // Weddings and families also reach persons outside the scope (the partner, the children)
  const everyone = (context.everyone as P[] | undefined) ?? persons;
  const weddings = marriages(relations, context.weddingEvents ?? [], new Set(everyone.map((p) => p.id)));
  const collator = collatorFor(language);
  const surnames = rank(
    groups,
    'surname',
    persons.map((p) => [p.id, p.lastName]),
    collator,
  );
  const birthplaces = rank(
    groups,
    'birthplace',
    persons.map((p) => [p.id, p.birthPlace]),
    collator,
  );
  const { generations: generationList, families } = generationRows(persons, between, groups);

  const statistics: Statistics<P> = {
    total: persons.length,
    living: groups.size('living'),
    deceased: groups.size('deceased'),
    male: groups.size('gender', 'MALE'),
    female: groups.size('gender', 'FEMALE'),
    unknownGender: groups.size('gender', 'UNKNOWN'),
    relations: between.length,
    livingAges: buckets(groups, 'livingAge'),
    deathAges: buckets(groups, 'deathAge'),
    withoutAge: groups.size('withoutAge'),
    probablyDeceased: groups.size('probablyDeceased'),
    averageLifespan,
    oldestBirth,
    surnames: surnames.top,
    distinctSurnames: surnames.distinct,
    birthplaces: birthplaces.top,
    distinctBirthplaces: birthplaces.distinct,
    withBirthplace: birthplaces.total,
    generations: generationList,
    families,
    unconnected: groups.size('unconnected'),
    completeness: completeness(persons, relations, groups, context),
    timeline: timeline(persons, weddings, groups),
    lives: lives(persons, everyone, relations, weddings, groups),
    firstNames: firstNames(persons, groups, collator),
    migration: migration(persons, context.placeEvents ?? [], groups, collator),
    records: familyRecords(persons, everyone, relations, weddings),
  };
  return { statistics, groups: groups.members };
}

/** The persons behind a filter, in the order given to `computeStatistics` */
export function personsOf<P extends StatPerson>(persons: P[], groups: Map<string, Set<string>>, filter: string): P[] {
  const ids = new Set(groups.get(filterKey(filter)) ?? []);
  return persons.filter((p) => ids.has(p.id));
}
