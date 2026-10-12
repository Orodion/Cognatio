import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { GraphQLContext } from '../lib/treeScope.js';

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
  label?: string;
  active?: boolean;
  note?: string;
  startDate?: string;
  endDate?: string;
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

function parseOptionalDate(value: string | undefined, field: string): Date | null {
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
  const von = parseOptionalDate(data.startDate, 'startDate');
  const bis = parseOptionalDate(data.endDate, 'endDate');
  if (von && bis && bis < von) {
    throw new GraphQLError('The end date must not be before the start date.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'DATE_ORDER' },
    });
  }
}

/** Exact date of birth "DD.MM.YYYY" as a date (start of a parent-child relation); otherwise null */
export function birthDateOf(birthDate: string | null | undefined): Date | null {
  const m = birthDate?.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) {
    return null;
  }
  const date = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return date.getUTCDate() === Number(m[1]) ? date : null;
}

/**
 * Derives further relations after a parent-child relation has been created:
 * - Partners of the parent also become parents of the child (as long as the child has < 2 parents);
 *   the relation starts with the child's birth if the date of birth is known exactly
 * - Other children of the parent become siblings of the child
 */
async function inferFromParentChild(prisma: PrismaClient, parentId: string, childId: string) {
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
  // At most one partner becomes the second parent (a child has two parents at most)
  const secondParent = childParents.size < 2 ? [...parentPartners].find((id) => id !== childId && !childParents.has(id)) : undefined;
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
    createRelation: async (_: unknown, { data }: { data: RelationInput }, { prisma, treeId }: GraphQLContext) => {
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

      const relation = await prisma.relation.create({
        data: toPrismaData(data),
      });

      const pc = parentChildOf(relation);
      if (pc) {
        await inferFromParentChild(prisma, pc.parentId, pc.childId);
      }

      return toGraphQLRelation(relation);
    },

    // Update a relation
    updateRelation: async (_: unknown, { id, data }: { id: string; data: RelationInput }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const before = await assertRelationInTree(prisma, tree, id);
      if (data.type) {
        validateType(data.type);
      }
      validateDates(data);
      if (data.personAId && data.personBId && data.personAId === data.personBId) {
        throw new GraphQLError('PersonA and PersonB must not be identical.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'SELF_RELATION' },
        });
      }
      await assertPersonsExist(prisma, tree, data.personAId, data.personBId);
      if (data.active !== false) {
        await assertRelationAllowed(prisma, tree, data, id);
      }

      const relation = await prisma.relation.update({
        where: { id },
        data: toPrismaData(data),
      });

      // Only a new parent-child pairing derives further relations; editing a note must not bring back what was deleted
      const was = parentChildOf(before);
      const now = relation.active ? parentChildOf(relation) : null;
      if (now && (was?.parentId !== now.parentId || was?.childId !== now.childId)) {
        await inferFromParentChild(prisma, now.parentId, now.childId);
      }
      return toGraphQLRelation(relation);
    },

    // Deactivate a relation (soft delete)
    deleteRelation: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      await assertRelationInTree(prisma, await treeId(), id);
      await prisma.relation.update({
        where: { id },
        data: { active: false },
      });
      return true;
    },

    // Activate a deactivated relation again
    restoreRelation: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const before = await assertRelationInTree(prisma, tree, id);
      await assertRelationAllowed(prisma, tree, before, id);
      const relation = await prisma.relation.update({
        where: { id },
        data: { active: true },
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
