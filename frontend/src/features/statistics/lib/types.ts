import type { Person } from '@/features/persons/types/person';

/** Figures of the statistics as the backend computes them (lib/statistics); `filter` names the persons behind a figure */
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

type PersonName = Pick<Person, 'id' | 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName'>;

export interface CompletenessRow {
  fact: string;
  /** Persons the fact applies to */
  total: number;
  present: number;
  missing: number;
  /** The persons without the fact */
  filter: string;
}

export interface AncestorGeneration {
  /** 1 = the start person, 2 = parents … */
  generation: number;
  possible: number;
  /** Places of the pedigree filled */
  found: number;
  distinct: number;
  /** Persons whose father or mother is missing */
  openEnds: number;
  earliestBirth: number | null;
  latestBirth: number | null;
  filter: string;
  openEndsFilter: string;
}

export interface Ancestors {
  person: PersonName;
  isHomePerson: boolean;
  hasHomePerson: boolean;
  /** From the parents on: places filled and different persons */
  found: number;
  distinct: number;
  generations: AncestorGeneration[];
}

export interface DecadeRow {
  /** First year of the decade */
  decade: number;
  births: number;
  deaths: number;
  weddings: number;
}

export interface Timeline {
  decades: DecadeRow[];
  withoutBirthYear: number;
  withoutDeathYear: number;
}

export interface LifeCell {
  /** Mean in years; null below the minimum sample */
  mean: number | null;
  count: number;
  filter: string;
}

export interface LifeRow {
  /** First year of the century of birth; null: all */
  century: number | null;
  male: LifeCell;
  female: LifeCell;
  all: LifeCell;
}

export interface CountRow {
  key: string;
  count: number;
  filter: string;
}

export interface Lives {
  tables: Array<{ measure: string; rows: LifeRow[] }>;
  children: CountRow[];
  meanChildren: number | null;
  ageGaps: CountRow[];
  /** Mean years the man is older (negative: the woman) */
  meanAgeGap: number | null;
}

export interface RankedName {
  label: string;
  count: number;
  filter: string;
}

export interface FirstNames {
  male: RankedName[];
  female: RankedName[];
  fashion: Array<{ century: number; male: RankedName[]; female: RankedName[] }>;
}

export interface Migration {
  stayed: number;
  moved: number;
  moves: Array<{ from: string; to: string; count: number; filter: string }>;
  places: Array<{ place: string; persons: number; firstYear: number | null; lastYear: number | null; filter: string }>;
  morePlaces: number;
}

export interface FamilyRecord {
  kind: string;
  /** Years or a number of persons */
  value: number;
  /** Holders beyond those listed */
  ties: number;
  possibleError: boolean;
  persons: PersonName[];
}

export interface TreeStatistics {
  total: number;
  living: number;
  deceased: number;
  male: number;
  female: number;
  unknownGender: number;
  relations: number;
  livingAges: Bucket[];
  deathAges: Bucket[];
  withoutAge: number;
  probablyDeceased: number;
  averageLifespan: number | null;
  oldestBirth: { year: number; person: PersonName } | null;
  surnames: Ranked[];
  distinctSurnames: number;
  birthplaces: Ranked[];
  distinctBirthplaces: number;
  withBirthplace: number;
  generations: GenerationRow[];
  families: number;
  unconnected: number;
  completeness: { score: number | null; rows: CompletenessRow[] };
  timeline: Timeline;
  lives: Lives;
  firstNames: FirstNames;
  migration: Migration;
  records: FamilyRecord[];
  ancestors: Ancestors | null;
}

export interface SourceStatistics {
  persons: number;
  citedPersons: number;
  citations: number;
  sources: number;
  topSources: Array<{ id: string; title: string; abbreviation?: string | null; links: number }>;
}
