/**
 * Possible errors in a family tree: facts that are allowed but rarely true, such as a man entered as mother, a mother
 * of 60 or a wedding after the death. Only what is certain counts: an inexact date ("um 1880") is read with its
 * widest bounds, so it is only reported if even those do not fit. The rules serve three places – the warning before a
 * relation is saved, the page "Possible errors" and the tools of AI assistants. An approximate date ("um 1880") counts
 * as five years either way.
 */
import { dateKey, parseFlexibleDate, type DateParts, type ParsedDate } from '../flexibleDate.js';
import { PARTNER_TYPES, parentChildOf } from '../../resolvers/relationResolvers.js';
import { ancestorCycles } from '../transfer/cycles.js';
import { similarPairs } from '../search/search.js';
import { isUnknownGivenName } from '../transfer/format.js';

/** A parent younger than this at the birth of a child */
export const MIN_PARENT_AGE = 12;
/** A mother older than this at the birth of a child */
export const MAX_MOTHER_AGE = 55;
/** A life longer than this, or a person older than this without a date of death */
export const MAX_AGE = 110;

export const ISSUE_CODES = [
  'ROLE_GENDER',
  'PARTNER_IS_RELATIVE',
  'TOO_MANY_PARENTS',
  'CHILD_BORN_BEFORE_PARENT',
  'PARENT_TOO_YOUNG',
  'MOTHER_TOO_OLD',
  'PARENT_DIED_BEFORE_BIRTH',
  'PARTNERSHIP_BEFORE_BIRTH',
  'PARTNERSHIP_AFTER_DEATH',
  'DEATH_BEFORE_BIRTH',
  'LIFESPAN_TOO_LONG',
  'LIVING_TOO_OLD',
  'EVENT_BEFORE_BIRTH',
  'EVENT_AFTER_DEATH',
  'POSSIBLE_DUPLICATE',
  'ANCESTOR_CYCLE',
] as const;

export type IssueCode = (typeof ISSUE_CODES)[number];

/** The codes that concern a single relation (the warning before saving one) */
export const RELATION_CODES: readonly IssueCode[] = ISSUE_CODES.slice(0, 9);

export interface Issue {
  code: IssueCode;
  /** The persons concerned, the one the sentence is about first */
  personIds: string[];
  relationId?: string;
  eventId?: string;
  /** ROLE_GENDER: the role (MOTHER, FATHER, HUSBAND, WIFE) */
  role?: string;
  /** ROLE_GENDER: the gender of the person with that role */
  gender?: string;
  /** PARTNER_IS_RELATIVE: PARENT, ANCESTOR or SIBLING */
  kinship?: string;
  /** Age in full years (PARENT_TOO_YOUNG, MOTHER_TOO_OLD, LIFESPAN_TOO_LONG, LIVING_TOO_OLD) */
  age?: number;
  /** With `age`: the dates leave a range of ages – `age` is the highest possible (PARENT_TOO_YOUNG) or the lowest */
  inexact?: boolean;
  /** TOO_MANY_PARENTS: the number of parents */
  count?: number;
  /** EVENT_…: the title of the event */
  event?: string;
}

export interface CheckPerson {
  id: string;
  firstName: string;
  middleName?: string | null;
  nickname?: string | null;
  lastName?: string | null;
  birthName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
}

export interface CheckRelation {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  startDate?: Date | null;
}

export interface CheckEvent {
  id: string;
  personId: string;
  title: string;
  category: string;
  date?: string | null;
}

/** Events that need the person to be alive (an "other" event may be a burial or a memorial) */
const LIFE_EVENTS = ['BIRTH', 'BAPTISM', 'SCHOOL_START', 'WEDDING', 'OCCUPATION', 'MOVE'];
/** Events that cannot come before the birth */
const AFTER_BIRTH_EVENTS = [...LIFE_EVENTS, 'DEATH'];

const ROLE_GENDERS: Record<string, string> = { MOTHER: 'FEMALE', FATHER: 'MALE', WIFE: 'FEMALE', HUSBAND: 'MALE' };

/** Key of an issue that stays the same as long as the issue exists; it marks an issue as checked */
export const issueKey = (issue: Issue) => [issue.code, issue.relationId ?? issue.eventId ?? '', [...issue.personIds].sort().join(',')].join('|');

/** Years an approximate date ("um 1880", "vor 1880") may be off; a range keeps its own bounds */
const APPROXIMATE_YEARS = 5;

const readDate = (value: string | null | undefined): ParsedDate | null => {
  const result = value?.trim() ? parseFlexibleDate(value, true) : null;
  if (!result?.ok) {
    return null;
  }
  const date = result.value;
  if (date.precision !== 'APPROXIMATE' || dateKey(date.start) !== dateKey(date.end)) {
    return date;
  }
  return { ...date, start: { year: date.start.year - APPROXIMATE_YEARS }, end: { year: date.end.year + APPROXIMATE_YEARS } };
};

const keyOf = (parts: DateParts, bound: 'start' | 'end') => dateKey(parts, bound);
const dayKey = (date: Date) => date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
/** Full years between two date keys */
const yearsBetween = (from: number, to: number) => Math.floor((to - from) / 10000);
/** Youngest and oldest possible age at a date */
const ageRange = (birth: ParsedDate, at: ParsedDate) => ({
  min: yearsBetween(keyOf(birth.end, 'end'), keyOf(at.start, 'start')),
  max: yearsBetween(keyOf(birth.start, 'start'), keyOf(at.end, 'end')),
});

/** Persons and active relations of a family tree, prepared for the checks */
export class TreeFacts {
  readonly persons: Map<string, CheckPerson>;
  readonly parentsOf = new Map<string, Map<string, string>>();
  readonly siblingPairs = new Set<string>();

  constructor(
    persons: CheckPerson[],
    readonly relations: CheckRelation[],
  ) {
    this.persons = new Map(persons.map((p) => [p.id, p]));
    for (const rel of relations) {
      const pc = parentChildOf(rel);
      if (pc) {
        // The type names the role of the parent only if the parent is personB (MOTHER / FATHER)
        const parents = this.parentsOf.get(pc.childId) ?? new Map<string, string>();
        parents.set(pc.parentId, rel.type === 'CHILD' ? 'PARENT' : rel.type);
        this.parentsOf.set(pc.childId, parents);
      } else if (rel.type === 'SIBLING') {
        this.siblingPairs.add(pairKey(rel.personAId, rel.personBId));
      }
    }
  }

  /** True if `ancestorId` is a parent, grandparent … of `personId` */
  isAncestor(ancestorId: string, personId: string) {
    const seen = new Set<string>();
    const queue = [personId];
    while (queue.length) {
      for (const parent of this.parentsOf.get(queue.pop() as string)?.keys() ?? []) {
        if (parent === ancestorId) {
          return true;
        }
        if (!seen.has(parent)) {
          seen.add(parent);
          queue.push(parent);
        }
      }
    }
    return false;
  }

  areSiblings(a: string, b: string) {
    if (this.siblingPairs.has(pairKey(a, b))) {
      return true;
    }
    const parentsOfB = this.parentsOf.get(b);
    return [...(this.parentsOf.get(a)?.keys() ?? [])].some((parent) => parentsOfB?.has(parent));
  }
}

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/** Possible errors of one relation; `withParentCount`: also count the parents of a child */
export function relationIssues(rel: CheckRelation, facts: TreeFacts, withParentCount = true): Issue[] {
  const issues: Issue[] = [];
  const a = facts.persons.get(rel.personAId);
  const b = facts.persons.get(rel.personBId);
  if (!a || !b) {
    return issues;
  }
  const relationId = rel.id || undefined;
  const expected = ROLE_GENDERS[rel.type];
  if (expected && b.gender && b.gender !== 'UNKNOWN' && b.gender !== expected) {
    issues.push({ code: 'ROLE_GENDER', personIds: [b.id, a.id], relationId, role: rel.type, gender: b.gender });
  }

  if (PARTNER_TYPES.includes(rel.type)) {
    issues.push(...partnerIssues(rel, a, b, facts));
    return issues;
  }

  const pc = parentChildOf(rel);
  if (!pc) {
    return issues;
  }
  const parent = facts.persons.get(pc.parentId)!;
  const child = facts.persons.get(pc.childId)!;
  if (withParentCount) {
    const count = new Set([...(facts.parentsOf.get(child.id)?.keys() ?? []), parent.id]).size;
    if (count > 2) {
      issues.push({ code: 'TOO_MANY_PARENTS', personIds: [child.id], count });
    }
  }
  const role = rel.type === 'CHILD' ? null : rel.type;
  issues.push(...birthIssues(parent, child, role, relationId));
  return issues;
}

/** Age and death of a parent at the birth of the child */
function birthIssues(parent: CheckPerson, child: CheckPerson, role: string | null, relationId: string | undefined): Issue[] {
  const childBirth = readDate(child.birthDate);
  if (!childBirth) {
    return [];
  }
  const personIds = [parent.id, child.id];
  const issues: Issue[] = [];
  const parentBirth = readDate(parent.birthDate);
  if (parentBirth) {
    const age = ageRange(parentBirth, childBirth);
    const female = role === 'MOTHER' || (role === null && parent.gender === 'FEMALE');
    if (keyOf(childBirth.end, 'end') < keyOf(parentBirth.start, 'start')) {
      issues.push({ code: 'CHILD_BORN_BEFORE_PARENT', personIds, relationId });
    } else if (age.max < MIN_PARENT_AGE) {
      issues.push({ code: 'PARENT_TOO_YOUNG', personIds, relationId, age: Math.max(age.max, 0), inexact: age.max > age.min });
    } else if (female && age.min > MAX_MOTHER_AGE) {
      issues.push({ code: 'MOTHER_TOO_OLD', personIds, relationId, age: age.min, inexact: age.max > age.min });
    }
  }
  const parentDeath = readDate(parent.deathDate);
  if (parentDeath) {
    const female = role === 'MOTHER' || (role === null && parent.gender === 'FEMALE');
    // A father may die up to about nine months before the birth; one year leaves room for inexact dates
    const latest = keyOf(parentDeath.end, 'end') + (female ? 0 : 10000);
    if (latest < keyOf(childBirth.start, 'start')) {
      issues.push({ code: 'PARENT_DIED_BEFORE_BIRTH', personIds, relationId });
    }
  }
  return issues;
}

function partnerIssues(rel: CheckRelation, a: CheckPerson, b: CheckPerson, facts: TreeFacts): Issue[] {
  const issues: Issue[] = [];
  const relationId = rel.id || undefined;
  const personIds = [a.id, b.id];
  const directParent = facts.parentsOf.get(a.id)?.has(b.id) || facts.parentsOf.get(b.id)?.has(a.id);
  if (directParent) {
    issues.push({ code: 'PARTNER_IS_RELATIVE', personIds, relationId, kinship: 'PARENT' });
  } else if (facts.isAncestor(a.id, b.id) || facts.isAncestor(b.id, a.id)) {
    issues.push({ code: 'PARTNER_IS_RELATIVE', personIds, relationId, kinship: 'ANCESTOR' });
  } else if (facts.areSiblings(a.id, b.id)) {
    issues.push({ code: 'PARTNER_IS_RELATIVE', personIds, relationId, kinship: 'SIBLING' });
  }
  if (rel.startDate) {
    const start = dayKey(rel.startDate);
    for (const person of [a, b]) {
      const other = person === a ? b : a;
      const birth = readDate(person.birthDate);
      const death = readDate(person.deathDate);
      if (birth && start < keyOf(birth.start, 'start')) {
        issues.push({ code: 'PARTNERSHIP_BEFORE_BIRTH', personIds: [person.id, other.id], relationId });
      } else if (death && start > keyOf(death.end, 'end')) {
        issues.push({ code: 'PARTNERSHIP_AFTER_DEATH', personIds: [person.id, other.id], relationId });
      }
    }
  }
  return issues;
}

/** Dates of a person and its events */
function personIssues(person: CheckPerson, events: CheckEvent[], today: ParsedDate): Issue[] {
  const issues: Issue[] = [];
  const personIds = [person.id];
  const birth = readDate(person.birthDate);
  const death = readDate(person.deathDate);
  if (birth && death) {
    if (keyOf(death.end, 'end') < keyOf(birth.start, 'start')) {
      issues.push({ code: 'DEATH_BEFORE_BIRTH', personIds });
    } else if (ageRange(birth, death).min > MAX_AGE) {
      const age = ageRange(birth, death);
      issues.push({ code: 'LIFESPAN_TOO_LONG', personIds, age: age.min, inexact: age.max > age.min });
    }
  } else if (birth && !person.deathDate?.trim() && !person.deathPlace?.trim() && ageRange(birth, today).min > MAX_AGE) {
    const age = ageRange(birth, today);
    issues.push({ code: 'LIVING_TOO_OLD', personIds, age: age.min, inexact: age.max > age.min });
  }
  for (const event of events) {
    const date = readDate(event.date);
    if (!date) {
      continue;
    }
    if (birth && AFTER_BIRTH_EVENTS.includes(event.category) && keyOf(date.end, 'end') < keyOf(birth.start, 'start')) {
      issues.push({ code: 'EVENT_BEFORE_BIRTH', personIds, eventId: event.id, event: event.title });
    } else if (death && LIFE_EVENTS.includes(event.category) && keyOf(date.start, 'start') > keyOf(death.end, 'end')) {
      issues.push({ code: 'EVENT_AFTER_DEATH', personIds, eventId: event.id, event: event.title });
    }
  }
  return issues;
}

const todayDate = (now: Date): ParsedDate => {
  const parts = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  return { precision: 'EXACT', start: parts, end: parts };
};

/** All possible errors of a family tree (active persons, active relations between them, their events) */
export function treeIssues(persons: CheckPerson[], relations: CheckRelation[], events: CheckEvent[], now = new Date()): Issue[] {
  const facts = new TreeFacts(persons, relations);
  const issues: Issue[] = [];
  for (const rel of relations) {
    issues.push(...relationIssues(rel, facts, false));
  }
  for (const [childId, parents] of facts.parentsOf) {
    if (parents.size > 2) {
      issues.push({ code: 'TOO_MANY_PARENTS', personIds: [childId], count: parents.size });
    }
  }

  const eventsOf = new Map<string, CheckEvent[]>();
  for (const event of events) {
    eventsOf.set(event.personId, [...(eventsOf.get(event.personId) ?? []), event]);
  }
  const today = todayDate(now);
  for (const person of persons) {
    issues.push(...personIssues(person, eventsOf.get(person.id) ?? [], today));
  }

  const hasGivenName = (p: { firstName: string }) => !isUnknownGivenName(p.firstName);
  for (const pair of similarPairs(persons as Parameters<typeof similarPairs>[0], hasGivenName)) {
    issues.push({ code: 'POSSIBLE_DUPLICATE', personIds: pair });
  }
  for (const cycle of ancestorCycles(relations)) {
    issues.push({ code: 'ANCESTOR_CYCLE', personIds: cycle });
  }
  return issues;
}
