import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { GraphQLContext } from '../lib/treeScope.js';
import { exactAppDate } from '../lib/transfer/gedcomDate.js';
import { implausibleError, relationWarnings } from '../lib/plausibility/plausibility.js';

/**
 * Semantics of a relation: "personB is <type> of personA".
 * Example: { personAId: child, personBId: mother, type: 'MOTHER' }.
 */
export const RELATION_TYPES = ['MOTHER', 'FATHER', 'CHILD', 'SIBLING', 'HUSBAND', 'WIFE', 'LIFE_PARTNER', 'PARTNER', 'OTHER'] as const;

const PARENT_TYPES = ['MOTHER', 'FATHER'];
const CHILD_TYPES = ['CHILD'];
export const PARTNER_TYPES = ['HUSBAND', 'WIFE', 'LIFE_PARTNER', 'PARTNER'];

type RelationLike = { personAId: string; personBId: string; type: string };
type Gendered = { gender?: string | null };

/** Returns parent/child of a relation or null if it is not a parent-child relation. */
export function parentChildOf(rel: RelationLike): { parentId: string; childId: string } | null {
  if (PARENT_TYPES.includes(rel.type)) {
    return { parentId: rel.personBId, childId: rel.personAId };
  }
  if (CHILD_TYPES.includes(rel.type)) {
    return { parentId: rel.personAId, childId: rel.personBId };
  }
  return null;
}

/** Compares two relations of the same pair of persons by content (regardless of the recording direction). */
export function isSameRelation(a: RelationLike, b: RelationLike): boolean {
  const pcA = parentChildOf(a);
  const pcB = parentChildOf(b);
  if (pcA || pcB) {
    return !!pcA && !!pcB && pcA.parentId === pcB.parentId && pcA.childId === pcB.childId;
  }
  const category = (type: string) => (PARTNER_TYPES.includes(type) ? 'PARTNER' : type);
  return category(a.type) === category(b.type);
}

function byGender(person: Gendered, male: string, female: string, fallback: string) {
  if (person.gender === 'MALE') {
    return male;
  }
  if (person.gender === 'FEMALE') {
    return female;
  }
  return fallback;
}

/** Role of the other person from the viewpoint of the person being viewed (e.g. "MOTHER", "CHILD"). */
export function roleOfOther(type: string, viewerIsA: boolean, other: Gendered): string {
  if (viewerIsA) {
    return type;
  }
  // The viewer is personB, the other person is personA
  if (PARENT_TYPES.includes(type)) {
    return 'CHILD';
  }
  if (CHILD_TYPES.includes(type)) {
    return byGender(other, 'FATHER', 'MOTHER', 'PARENT');
  }
  if (type === 'HUSBAND' || type === 'WIFE') {
    return byGender(other, 'HUSBAND', 'WIFE', 'SPOUSE');
  }
  return type;
}

interface RelationInput {
  personAId: string;
  personBId: string;
  type: string;
  label?: string | null;
  active?: boolean | null;
  note?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

function validateType(type: string) {
  if (!(RELATION_TYPES as readonly string[]).includes(type)) {
    throw new GraphQLError(`Invalid relation type "${type}". Allowed: ${RELATION_TYPES.join(', ')}`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_RELATION_TYPE' },
    });
  }
}

/** Both persons must be in the active family tree – there are no relations across family trees */
async function assertPersonsExist(prisma: PrismaClient, treeId: string, personAId: string, personBId: string) {
  const persons = await prisma.person.findMany({
    where: { id: { in: [personAId, personBId] }, familyTreeId: treeId },
    select: { id: true },
  });
  const foundIds = persons.map((p) => p.id);
  if (!foundIds.includes(personAId) || !foundIds.includes(personBId)) {
    throw new GraphQLError('One or both persons do not exist.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'PERSON_NOT_FOUND' },
    });
  }
}

function parseOptionalDate(value: string | null | undefined, field: string): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError(`Invalid date for ${field}: "${value}"`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_DATE' },
    });
  }
  return date;
}

function validateDates(data: RelationInput) {
  const start = parseOptionalDate(data.startDate, 'startDate');
  const end = parseOptionalDate(data.endDate, 'endDate');
  if (start && end && end < start) {
    throw new GraphQLError('The end date must not be before the start date.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'DATE_ORDER' },
    });
  }
}

/** Exact date of birth in every form the form accepts as a date (start of a parent-child relation); otherwise null */
export const birthDateOf = (birthDate: string | null | undefined): Date | null => exactAppDate(birthDate);

/**
 * Derives further relations after a parent-child relation has been created (in the same transaction):
 * - The partner of the parent also becomes a parent of the child – only if the parent has exactly one active partner
 *   and the child has no second parent yet; with several partners nobody is guessed, the user adds the second parent.
 *   The relation starts with the child's birth if the date of birth is known exactly.
 * - Other children of the parent become siblings of the child
 */
async function inferFromParentChild(prisma: Pick<PrismaClient, 'relation' | 'person'>, parentId: string, childId: string) {
  const related =
    (await prisma.relation.findMany({
      where: {
        active: true,
        OR: [{ personAId: { in: [parentId, childId] } }, { personBId: { in: [parentId, childId] } }],
      },
    })) ?? [];

  const other = (rel: RelationLike, id: string) => (rel.personAId === id ? rel.personBId : rel.personAId);
  const involves = (rel: RelationLike, id: string) => rel.personAId === id || rel.personBId === id;

  const childParents = new Set<string>();
  const parentChildren = new Set<string>();
  const childSiblings = new Set<string>();
  const parentPartners = new Set<string>();

  for (const rel of related) {
    const pc = parentChildOf(rel);
    if (pc) {
      if (pc.childId === childId) {
        childParents.add(pc.parentId);
      }
      if (pc.parentId === parentId) {
        parentChildren.add(pc.childId);
      }
    } else if (rel.type === 'SIBLING' && involves(rel, childId)) {
      childSiblings.add(other(rel, childId));
    } else if (PARTNER_TYPES.includes(rel.type) && involves(rel, parentId)) {
      parentPartners.add(other(rel, parentId));
    }
  }
  childParents.add(parentId);

  const toCreate: Array<RelationLike & { startDate?: Date; active: boolean }> = [];
  // A child has two parents at most; the second one only when it is clear who it is
  parentPartners.delete(childId);
  const [onlyPartner] = parentPartners.size === 1 ? parentPartners : [];
  const secondParent = childParents.size < 2 && onlyPartner && !childParents.has(onlyPartner) ? onlyPartner : undefined;
  if (secondParent) {
    const child = await prisma.person.findUnique({ where: { id: childId }, select: { birthDate: true } });
    const born = birthDateOf(child?.birthDate);
    toCreate.push({ personAId: secondParent, personBId: childId, type: 'CHILD', ...(born && { startDate: born }), active: true });
  }
  for (const siblingId of parentChildren) {
    if (siblingId === childId || childSiblings.has(siblingId)) {
      continue;
    }
    toCreate.push({ personAId: childId, personBId: siblingId, type: 'SIBLING', active: true });
  }

  // One statement: the derived relations are written all together or not at all
  if (toCreate.length) {
    await prisma.relation.createMany({ data: toCreate });
  }
}

/** Parents of every person by the active parent-child relations of the family tree */
async function activeParents(prisma: Pick<PrismaClient, 'relation'>, treeId: string) {
  const relations =
    (await prisma.relation.findMany({
      where: { active: true, type: { in: [...PARENT_TYPES, ...CHILD_TYPES] }, personA: { familyTreeId: treeId } },
      select: { personAId: true, personBId: true, type: true },
    })) ?? [];
  const parentsOf = new Map<string, Set<string>>();
  for (const rel of relations) {
    const pc = parentChildOf(rel);
    if (pc) {
      parentsOf.set(pc.childId, (parentsOf.get(pc.childId) ?? new Set()).add(pc.parentId));
    }
  }
  return parentsOf;
}

/** Sibling relations between `childId` and any of `siblingIds`, in both recording directions */
const siblingsOf = (childId: string, siblingIds: string[]) => ({
  type: 'SIBLING',
  OR: [
    { personAId: childId, personBId: { in: siblingIds } },
    { personBId: childId, personAId: { in: siblingIds } },
  ],
});

/**
 * After a parent-child relation has ended (deleted or changed to other persons): children of the parent that shared
 * no other parent with the child are no siblings of it any more – their sibling relation goes into the recycle bin as
 * well. Siblings with another common parent and siblings entered without a common parent stay.
 */
async function releaseSiblings(prisma: Pick<PrismaClient, 'relation'>, treeId: string, parentId: string, childId: string) {
  const parentsOf = await activeParents(prisma, treeId);
  const childParents = parentsOf.get(childId) ?? new Set<string>();
  const former = [...parentsOf]
    .filter(([id, parents]) => id !== childId && parents.has(parentId) && ![...parents].some((p) => childParents.has(p)))
    .map(([id]) => id);
  if (former.length) {
    await prisma.relation.updateMany({ where: { active: true, ...siblingsOf(childId, former) }, data: { active: false } });
  }
}

/**
 * After a parent-child relation came back from the recycle bin: the sibling relations to the other children of the
 * parent that are in the recycle bin come back too (one per pair, and only where no active one exists).
 */
async function restoreSiblings(prisma: Pick<PrismaClient, 'relation'>, treeId: string, parentId: string, childId: string) {
  const parentsOf = await activeParents(prisma, treeId);
  const fellows = [...parentsOf].filter(([id, parents]) => id !== childId && parents.has(parentId)).map(([id]) => id);
  if (!fellows.length) {
    return;
  }
  const relations = (await prisma.relation.findMany({ where: siblingsOf(childId, fellows), orderBy: { updatedAt: 'desc' } })) ?? [];
  const other = (rel: RelationLike) => (rel.personAId === childId ? rel.personBId : rel.personAId);
  const linked = new Set(relations.filter((rel) => rel.active).map(other));
  const back: string[] = [];
  for (const rel of relations) {
    if (!rel.active && !linked.has(other(rel))) {
      linked.add(other(rel));
      back.push(rel.id);
    }
  }
  if (back.length) {
    await prisma.relation.updateMany({ where: { id: { in: back } }, data: { active: true } });
  }
}

/**
 * True if `ancestorId` is a parent, grandparent … of `personId`. Only active parent-child relations of the family
 * tree count; `ignoreId` leaves out the relation that is just being changed.
 */
async function isAncestorOf(prisma: PrismaClient, treeId: string, ancestorId: string, personId: string, ignoreId?: string) {
  const relations =
    (await prisma.relation.findMany({
      where: { active: true, type: { in: [...PARENT_TYPES, ...CHILD_TYPES] }, personA: { familyTreeId: treeId } },
      select: { id: true, personAId: true, personBId: true, type: true },
    })) ?? [];
  const parentsOf = new Map<string, string[]>();
  for (const rel of relations) {
    const pc = rel.id === ignoreId ? null : parentChildOf(rel);
    if (pc) {
      parentsOf.set(pc.childId, [...(parentsOf.get(pc.childId) ?? []), pc.parentId]);
    }
  }
  const seen = new Set<string>();
  const queue = [personId];
  while (queue.length) {
    const current = queue.pop() as string;
    for (const parent of parentsOf.get(current) ?? []) {
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

/**
 * An active relation must not repeat another active one of the same two persons, and a parent-child relation must
 * not make a person their own ancestor. `ignoreId` is the relation that is just being changed or restored.
 */
async function assertRelationAllowed(prisma: PrismaClient, treeId: string, rel: RelationLike, ignoreId?: string) {
  const existing =
    (await prisma.relation.findMany({
      where: {
        active: true,
        OR: [
          { personAId: rel.personAId, personBId: rel.personBId },
          { personAId: rel.personBId, personBId: rel.personAId },
        ],
      },
    })) ?? [];
  if (existing.some((other) => other.id !== ignoreId && isSameRelation(other, rel))) {
    throw new GraphQLError('This relation already exists.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'DUPLICATE' },
    });
  }
  const pc = parentChildOf(rel);
  if (pc && (await isAncestorOf(prisma, treeId, pc.childId, pc.parentId, ignoreId))) {
    throw new GraphQLError('A person cannot be their own ancestor.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'CYCLE' },
    });
  }
}

/**
 * A relation that looks wrong (e.g. a man as mother, a partner who is also a child) is refused with its possible
 * errors (IMPLAUSIBLE) unless the user confirmed it; the frontend asks and saves again with `confirmed`.
 */
async function assertPlausible(prisma: PrismaClient, treeId: string, rel: RelationLike & { id?: string; startDate?: Date | null }, confirmed?: boolean) {
  if (confirmed) {
    return;
  }
  const issues = await relationWarnings(prisma, treeId, rel);
  if (issues.length) {
    throw await implausibleError(prisma, issues);
  }
}

/** Relation of the active family tree (both persons are in the same family tree) */
async function assertRelationInTree(prisma: PrismaClient, treeId: string, id: string) {
  const relation = await prisma.relation.findFirst({ where: { id, personA: { familyTreeId: treeId } } });
  if (!relation) {
    throw new GraphQLError('Relation does not exist.', {
      extensions: { code: 'NOT_FOUND', reason: 'RELATION_NOT_FOUND' },
    });
  }
  return relation;
}

/** Fields of a new relation: what is not given stays empty, a new relation is active */
function toPrismaData(data: RelationInput) {
  return {
    ...data,
    label: data.label ?? null,
    note: data.note ?? null,
    active: data.active ?? true,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
  };
}

/** Fields of a changed relation: a field that is not passed keeps its value, null (or an empty date) clears it */
function toPrismaUpdate(data: RelationInput) {
  const date = (value: string | null | undefined) => (value === undefined ? undefined : value ? new Date(value) : null);
  return {
    personAId: data.personAId,
    personBId: data.personBId,
    type: data.type,
    label: data.label,
    note: data.note,
    active: data.active ?? undefined,
    startDate: date(data.startDate),
    endDate: date(data.endDate),
  };
}

/** Maps a Prisma relation object to a GraphQL-compatible object (DateTime -> String) */
function toGraphQLRelation(rel: {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  label: string | null;
  active: boolean;
  note: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...rel,
    startDate: rel.startDate ? rel.startDate.toISOString() : null,
    endDate: rel.endDate ? rel.endDate.toISOString() : null,
    createdAt: rel.createdAt.toISOString(),
    updatedAt: rel.updatedAt.toISOString(),
  };
}

export const relationResolvers = {
  Query: {
    // All relations (by default only active ones)
    getRelations: async (_: unknown, { includeInactive }: { includeInactive?: boolean }, { prisma, treeId }: GraphQLContext) => {
      const relations = await prisma.relation.findMany({
        where: { personA: { familyTreeId: await treeId() }, ...(includeInactive ? {} : { active: true }) },
        orderBy: { createdAt: 'asc' },
      });
      return relations.map(toGraphQLRelation);
    },

    // All relations of a given person (with the other person resolved)
    getPersonRelations: async (_: unknown, { personId }: { personId: string }, { prisma, treeId }: GraphQLContext) => {
      const relations = await prisma.relation.findMany({
        where: {
          active: true,
          personA: { familyTreeId: await treeId() },
          OR: [{ personAId: personId }, { personBId: personId }],
        },
        include: {
          personA: true,
          personB: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return (
        relations
          // Hide relations to persons in the recycle bin
          .filter((rel) => !(rel.personAId === personId ? rel.personB : rel.personA)?.isDeleted)
          .map((rel) => {
            const isPersonA = rel.personAId === personId;
            const otherPerson = isPersonA ? rel.personB : rel.personA;

            const role = roleOfOther(rel.type, isPersonA, otherPerson);

            return {
              id: rel.id,
              type: rel.type,
              role,
              label: rel.label,
              note: rel.note,
              active: rel.active,
              otherPerson,
              createdAt: rel.createdAt.toISOString(),
              startDate: rel.startDate ? rel.startDate.toISOString() : null,
              endDate: rel.endDate ? rel.endDate.toISOString() : null,
            };
          })
      );
    },
  },

  Mutation: {
    // Create a new relation
    createRelation: async (_: unknown, { data, confirmed }: { data: RelationInput; confirmed?: boolean }, { prisma, treeId }: GraphQLContext) => {
      if (!data.personAId || !data.personBId) {
        throw new GraphQLError('Both persons (personAId, personBId) must be given.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'PERSONS_REQUIRED' },
        });
      }
      if (data.personAId === data.personBId) {
        throw new GraphQLError('A person cannot be in a relation with itself.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'SELF_RELATION' },
        });
      }
      validateType(data.type);
      validateDates(data);
      const tree = await treeId();
      await assertPersonsExist(prisma, tree, data.personAId, data.personBId);
      await assertRelationAllowed(prisma, tree, data);
      await assertPlausible(prisma, tree, { ...data, startDate: data.startDate ? new Date(data.startDate) : null }, confirmed);

      // The relation and what it derives are written together or not at all
      const relation = await prisma.$transaction(async (tx) => {
        const created = await tx.relation.create({
          data: toPrismaData(data),
        });
        const pc = parentChildOf(created);
        if (pc) {
          await inferFromParentChild(tx, pc.parentId, pc.childId);
        }
        return created;
      });

      return toGraphQLRelation(relation);
    },

    // Update a relation
    updateRelation: async (
      _: unknown,
      { id, data, confirmed }: { id: string; data: RelationInput; confirmed?: boolean },
      { prisma, treeId }: GraphQLContext,
    ) => {
      const tree = await treeId();
      const before = await assertRelationInTree(prisma, tree, id);
      if (data.type) {
        validateType(data.type);
      }
      // A date that is not passed keeps its value – the order is checked with it
      const kept = (value: string | null | undefined, stored: Date | null) => (value === undefined ? stored?.toISOString() : value);
      validateDates({ ...data, startDate: kept(data.startDate, before.startDate), endDate: kept(data.endDate, before.endDate) });
      if (data.personAId && data.personBId && data.personAId === data.personBId) {
        throw new GraphQLError('PersonA and PersonB must not be identical.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'SELF_RELATION' },
        });
      }
      await assertPersonsExist(prisma, tree, data.personAId, data.personBId);
      if ((data.active ?? before.active) !== false) {
        await assertRelationAllowed(prisma, tree, data, id);
        // Only a change of the persons, the kind or the start is checked again – editing a note does not ask twice
        const after = {
          id,
          personAId: data.personAId ?? before.personAId,
          personBId: data.personBId ?? before.personBId,
          type: data.type ?? before.type,
          startDate: data.startDate === undefined ? before.startDate : data.startDate ? new Date(data.startDate) : null,
        };
        const changed =
          after.personAId !== before.personAId ||
          after.personBId !== before.personBId ||
          after.type !== before.type ||
          after.startDate?.getTime() !== before.startDate?.getTime() ||
          before.active === false;
        if (changed) {
          await assertPlausible(prisma, tree, after, confirmed);
        }
      }

      const relation = await prisma.$transaction(async (tx) => {
        const updated = await tx.relation.update({
          where: { id },
          data: toPrismaUpdate(data),
        });
        // Only a new parent-child pairing derives further relations; editing a note must not bring back what was deleted.
        // An ended pairing takes the siblings along that came only through it
        const was = parentChildOf(before);
        const now = updated.active ? parentChildOf(updated) : null;
        const pairingChanged = was?.parentId !== now?.parentId || was?.childId !== now?.childId;
        if (was && before.active && pairingChanged) {
          await releaseSiblings(tx, tree, was.parentId, was.childId);
        }
        if (now && pairingChanged) {
          await inferFromParentChild(tx, now.parentId, now.childId);
        }
        return updated;
      });
      return toGraphQLRelation(relation);
    },

    // Deactivate a relation (soft delete)
    deleteRelation: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const before = await assertRelationInTree(prisma, tree, id);
      // Together with the siblings that were derived from it, or not at all
      await prisma.$transaction(async (tx) => {
        await tx.relation.update({
          where: { id },
          data: { active: false },
        });
        const pc = before.active ? parentChildOf(before) : null;
        if (pc) {
          await releaseSiblings(tx, tree, pc.parentId, pc.childId);
        }
      });
      return true;
    },

    // Activate a deactivated relation again
    restoreRelation: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const before = await assertRelationInTree(prisma, tree, id);
      await assertRelationAllowed(prisma, tree, before, id);
      const relation = await prisma.$transaction(async (tx) => {
        const restored = await tx.relation.update({
          where: { id },
          data: { active: true },
        });
        const pc = before.active ? null : parentChildOf(before);
        if (pc) {
          await restoreSiblings(tx, tree, pc.parentId, pc.childId);
        }
        return restored;
      });
      return toGraphQLRelation(relation);
    },

    // Delete a relation permanently
    hardDeleteRelation: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      await assertRelationInTree(prisma, await treeId(), id);
      await prisma.relation.delete({
        where: { id },
      });
      return true;
    },
  },
};
