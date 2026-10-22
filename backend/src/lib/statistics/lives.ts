/**
 * Lives through time: life expectancy (also of those who reached 15, so child mortality does not hide adult life), the
 * age at the first wedding and at the birth of the first child – each per century of birth and gender –, the number of
 * children per couple and the age gap between partners. A mean of fewer than MIN_SAMPLE persons is not shown.
 */
import type { Groups } from './groups.js';
import { buildFamilyIndex, parentRoles, parentSlots, type FamilyRelation } from './family.js';
import { firstWeddings, type Marriage } from './marriages.js';
import { yearOf } from './scope.js';

export const MIN_SAMPLE = 5;
/** Lives counted from this age on in the second figure of life expectancy */
const ADULT_AGE = 15;
/** The highest group of the children per couple ("10 and more") */
const MAX_CHILDREN = 10;
/** Partners born within this many years count as of the same age */
const SAME_AGE = 1;

export const LIFE_MEASURES = ['lifespan', 'adultLifespan', 'firstWedding', 'firstChild'] as const;
type Measure = (typeof LIFE_MEASURES)[number];
type GenderColumn = 'male' | 'female' | 'all';

export interface LifePerson {
  id: string;
  gender?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
}

export interface LifeCell {
  /** Mean in whole years; null below MIN_SAMPLE */
  mean: number | null;
  /** Persons it is based on */
  count: number;
  filter: string;
}

export interface LifeRow {
  /** First year of the century of birth (1800 = 1800–1899); null: all centuries */
  century: number | null;
  male: LifeCell;
  female: LifeCell;
  all: LifeCell;
}

export interface LifeTable {
  measure: Measure;
  rows: LifeRow[];
}

export interface CountRow {
  /** Number of children (MAX_CHILDREN: that many and more), or manOlder / sameAge / womanOlder */
  key: string;
  count: number;
  filter: string;
}

export interface Lives {
  tables: LifeTable[];
  /** Couples by their number of common children */
  children: CountRow[];
  meanChildren: number | null;
  /** Couples of a man and a woman with both years of birth: who is older */
  ageGaps: CountRow[];
  /** Mean years the man is older (negative: the woman) */
  meanAgeGap: number | null;
}

const centuryOf = (year: number) => Math.floor(year / 100) * 100;
const genderColumn = (gender?: string | null): GenderColumn | null => (gender === 'MALE' ? 'male' : gender === 'FEMALE' ? 'female' : null);
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/** Ages per measure, century and gender column, with the persons behind them */
class Samples {
  private readonly values = new Map<string, Array<{ id: string; age: number }>>();
  add(measure: Measure, birthYear: number, gender: string | null | undefined, id: string, age: number) {
    const column = genderColumn(gender);
    for (const century of [String(centuryOf(birthYear)), 'all']) {
      for (const g of column ? [column, 'all'] : ['all']) {
        const key = `${measure}:${century}:${g}`;
        const list = this.values.get(key) ?? [];
        list.push({ id, age });
        this.values.set(key, list);
      }
    }
  }
  centuries(measure: Measure): number[] {
    const found = [...this.values.keys()].filter((k) => k.startsWith(`${measure}:`) && !k.includes(':all:')).map((k) => Number(k.split(':')[1]));
    return [...new Set(found)].sort((a, b) => a - b);
  }
  cell(measure: Measure, century: number | null, gender: GenderColumn, groups: Groups): LifeCell {
    const key = `${measure}:${century ?? 'all'}:${gender}`;
    const values = this.values.get(key) ?? [];
    values.forEach((v) => groups.add(v.id, 'lives', key));
    const average = values.length >= MIN_SAMPLE ? mean(values.map((v) => v.age)) : null;
    return { mean: average === null ? null : Math.round(average), count: values.length, filter: `lives:${key}` };
  }
}

/**
 * `persons`: the scope; `everyone`: all persons of the family tree (children and partners outside the scope count).
 * Filters: `lives:<measure>:<century|all>:<male|female|all>`, `children:<n>`, `ageGap:<manOlder|sameAge|womanOlder>`.
 */
export function lives(persons: LifePerson[], everyone: LifePerson[], relations: FamilyRelation[], weddings: Marriage[], groups: Groups): Lives {
  const birthYear = new Map(everyone.map((p) => [p.id, yearOf(p.birthDate)]));
  const roles = parentRoles(relations, new Map(everyone.map((p) => [p.id, p.gender])));
  const firstWedding = firstWeddings(weddings);
  const firstChild = new Map<string, number>();
  const couples = new Map<string, { ids: [string, string]; children: number }>();
  const couple = (a: string, b: string) => {
    const ids = [a, b].sort() as [string, string];
    const key = ids.join('|');
    return couples.get(key) ?? couples.set(key, { ids, children: 0 }).get(key)!;
  };
  for (const child of everyone) {
    const { father, mother } = parentSlots(roles.get(child.id));
    const born = birthYear.get(child.id);
    for (const parent of [father, mother]) {
      if (parent && born != null) {
        firstChild.set(parent, Math.min(firstChild.get(parent) ?? born, born));
      }
    }
    if (father && mother) {
      couple(father, mother).children++;
    }
  }
  const ids = new Set(everyone.map((p) => p.id));
  for (const [a, partners] of buildFamilyIndex(relations, ids).partners) {
    partners.forEach((b) => couple(a, b));
  }

  const samples = new Samples();
  for (const p of persons) {
    const born = birthYear.get(p.id);
    if (born == null) {
      continue;
    }
    const died = p.deathDate?.trim() || p.deathPlace?.trim() ? yearOf(p.deathDate) : null;
    if (died !== null && died >= born) {
      samples.add('lifespan', born, p.gender, p.id, died - born);
      if (died - born >= ADULT_AGE) {
        samples.add('adultLifespan', born, p.gender, p.id, died - born);
      }
    }
    const wedding = firstWedding.get(p.id);
    if (wedding !== undefined && wedding >= born) {
      samples.add('firstWedding', born, p.gender, p.id, wedding - born);
    }
    const child = firstChild.get(p.id);
    if (child !== undefined && child >= born) {
      samples.add('firstChild', born, p.gender, p.id, child - born);
    }
  }
  const tables = LIFE_MEASURES.map((measure) => ({
    measure,
    rows: [...samples.centuries(measure), null].map((century) => ({
      century,
      male: samples.cell(measure, century, 'male', groups),
      female: samples.cell(measure, century, 'female', groups),
      all: samples.cell(measure, century, 'all', groups),
    })),
  }));

  // Couples with one of the partners in the scope
  const scope = new Set(persons.map((p) => p.id));
  const genderOf = new Map(everyone.map((p) => [p.id, p.gender]));
  const childCounts = new Map<number, number>();
  const gapCounts = new Map<string, number>();
  const childNumbers: number[] = [];
  const gaps: number[] = [];
  for (const { ids: pair, children } of couples.values()) {
    const inScope = pair.filter((id) => scope.has(id));
    if (!inScope.length) {
      continue;
    }
    const group = Math.min(children, MAX_CHILDREN);
    childCounts.set(group, (childCounts.get(group) ?? 0) + 1);
    childNumbers.push(children);
    inScope.forEach((id) => groups.add(id, 'children', group));
    const man = pair.find((id) => genderOf.get(id) === 'MALE');
    const woman = pair.find((id) => genderOf.get(id) === 'FEMALE');
    const manBorn = man ? birthYear.get(man) : null;
    const womanBorn = woman ? birthYear.get(woman) : null;
    if (manBorn != null && womanBorn != null) {
      const gap = womanBorn - manBorn;
      const key = gap > SAME_AGE ? 'manOlder' : gap < -SAME_AGE ? 'womanOlder' : 'sameAge';
      gapCounts.set(key, (gapCounts.get(key) ?? 0) + 1);
      gaps.push(gap);
      inScope.forEach((id) => groups.add(id, 'ageGap', key));
    }
  }
  // From 0 to the highest number that occurs, without gaps
  const children = childNumbers.length
    ? Array.from({ length: Math.max(...childCounts.keys()) + 1 }, (_, n) => ({ key: String(n), count: childCounts.get(n) ?? 0, filter: `children:${n}` }))
    : [];
  const ageGaps = gaps.length ? ['manOlder', 'sameAge', 'womanOlder'].map((key) => ({ key, count: gapCounts.get(key) ?? 0, filter: `ageGap:${key}` })) : [];
  const meanChildren = mean(childNumbers);
  const meanAgeGap = mean(gaps);
  return {
    tables,
    children,
    meanChildren: meanChildren === null ? null : Math.round(meanChildren * 10) / 10,
    ageGaps,
    meanAgeGap: meanAgeGap === null ? null : Math.round(meanAgeGap * 10) / 10,
  };
}
