import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { RELATION_CODES, TreeFacts, issueKey, relationIssues, treeIssues, type CheckRelation, type Issue } from './checks.js';

const PERSON_FIELDS = {
  id: true,
  firstName: true,
  middleName: true,
  nickname: true,
  lastName: true,
  birthName: true,
  gender: true,
  birthDate: true,
  deathDate: true,
  deathPlace: true,
} as const;

type Db = Pick<PrismaClient, 'person' | 'relation' | 'event' | 'familyTree'>;

/** Active persons and the active relations between them */
async function treeFacts(db: Db, treeId: string, ignoreRelationId?: string) {
  const persons = (await db.person.findMany({ where: { familyTreeId: treeId, isDeleted: false }, select: PERSON_FIELDS })) ?? [];
  if (!persons.length) {
    return { persons, relations: [] };
  }
  const ids = new Set(persons.map((p) => p.id));
  const relations = (
    (await db.relation.findMany({
      where: { active: true, personA: { familyTreeId: treeId } },
      select: { id: true, personAId: true, personBId: true, type: true, startDate: true },
    })) ?? []
  ).filter((r) => r.id !== ignoreRelationId && ids.has(r.personAId) && ids.has(r.personBId));
  return { persons, relations };
}

export interface TreeIssue extends Issue {
  key: string;
  checked: boolean;
}

/** All possible errors of the family tree; those the user marked as right are `checked` */
export async function loadTreeIssues(db: Db, treeId: string): Promise<TreeIssue[]> {
  const { persons, relations } = await treeFacts(db, treeId);
  const [events, tree] = await Promise.all([
    db.event.findMany({
      where: { person: { familyTreeId: treeId, isDeleted: false } },
      select: { id: true, personId: true, title: true, category: true, date: true },
    }),
    db.familyTree.findUnique({ where: { id: treeId }, select: { checkedIssues: true } }),
  ]);
  const checked = new Set(tree?.checkedIssues ?? []);
  return treeIssues(persons, relations, events).map((issue) => {
    const key = issueKey(issue);
    return { ...issue, key, checked: checked.has(key) };
  });
}

/** Possible errors a new or changed relation would bring (the relation itself is not saved yet) */
export async function relationWarnings(db: Db, treeId: string, rel: Omit<CheckRelation, 'id'> & { id?: string }) {
  const { persons, relations } = await treeFacts(db, treeId, rel.id);
  const facts = new TreeFacts(persons, relations);
  return relationIssues({ ...rel, id: rel.id ?? '' }, facts).filter((issue) => RELATION_CODES.includes(issue.code));
}

const KINSHIP: Record<string, string> = { PARENT: 'parent and child', ANCESTOR: 'ancestor and descendant', SIBLING: 'siblings' };

/** The issue as an English sentence (for AI assistants and the log) */
export function issueSentence(issue: Issue, nameOf: (id: string) => string): string {
  const [a, b] = issue.personIds.map(nameOf);
  const age = issue.inexact ? `${issue.code === 'PARENT_TOO_YOUNG' ? 'at most' : 'at least'} ${issue.age}` : issue.age;
  switch (issue.code) {
    case 'ROLE_GENDER':
      return `${a} is entered as ${issue.role?.toLowerCase()} of ${b} but is ${issue.gender?.toLowerCase()}.`;
    case 'PARTNER_IS_RELATIVE':
      return `${a} and ${b} are partners but also ${KINSHIP[issue.kinship ?? ''] ?? 'related'}.`;
    case 'TOO_MANY_PARENTS':
      return `${a} has ${issue.count} parents.`;
    case 'CHILD_BORN_BEFORE_PARENT':
      return `${b} was born before the parent ${a}.`;
    case 'PARENT_TOO_YOUNG':
      return `${a} was ${issue.inexact ? '' : 'only '}${age} years old at the birth of ${b}.`;
    case 'MOTHER_TOO_OLD':
      return `${a} was ${age} years old at the birth of ${b}.`;
    case 'PARENT_DIED_BEFORE_BIRTH':
      return `${a} died before the birth of ${b}.`;
    case 'PARTNERSHIP_BEFORE_BIRTH':
      return `The partnership of ${a} and ${b} begins before ${a} was born.`;
    case 'PARTNERSHIP_AFTER_DEATH':
      return `The partnership of ${a} and ${b} begins after ${a} died.`;
    case 'DEATH_BEFORE_BIRTH':
      return `${a} died before being born.`;
    case 'LIFESPAN_TOO_LONG':
      return `${a} lived ${age} years.`;
    case 'LIVING_TOO_OLD':
      return `${a} would be ${age} years old today; the date of death is missing.`;
    case 'EVENT_BEFORE_BIRTH':
      return `"${issue.event}" of ${a} lies before the birth.`;
    case 'EVENT_AFTER_DEATH':
      return `"${issue.event}" of ${a} lies after the death.`;
    case 'POSSIBLE_DUPLICATE':
      return `${a} and ${b} could be the same person.`;
    case 'ANCESTOR_CYCLE':
      return `${issue.personIds.map(nameOf).join(', ')} are their own ancestors.`;
    default:
      return issue.code;
  }
}

/** Refusal of a relation with possible errors; saving again with the confirmation takes it anyway */
export async function implausibleError(db: Db, issues: Issue[]) {
  const ids = [...new Set(issues.flatMap((i) => i.personIds))];
  const persons = await db.person.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } });
  const names = new Map(persons.map((p) => [p.id, [p.firstName, p.lastName].filter(Boolean).join(' ')]));
  const sentences = issues.map((issue) => issueSentence(issue, (id) => names.get(id) ?? id));
  return new GraphQLError(`This relation looks wrong: ${sentences.join(' ')} Save it again with the confirmation if it is right.`, {
    extensions: { code: 'BAD_USER_INPUT', reason: 'IMPLAUSIBLE', issues },
  });
}
