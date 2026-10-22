import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../generated/prisma/client.js';
import { removeUploadedFile } from '../lib/files/uploads.js';
import { lockTree, treeNotFound, type GraphQLContext } from '../lib/treeScope.js';

interface FamilyTreeInput {
  name: string;
  description?: string | null;
}

const MAX_NAME_LENGTH = 100;

type FamilyTreeRow = {
  id: string;
  name: string;
  description: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  homePersonId?: string | null;
  _count?: { persons: number };
};

// Persons in the recycle bin do not count
const WITH_COUNT = { _count: { select: { persons: { where: { isDeleted: false } } } } } as const;

/** Times as ISO timestamps (Date would otherwise be returned as a number of milliseconds) */
const toGraphQL = (tree: FamilyTreeRow) => ({
  id: tree.id,
  name: tree.name,
  description: tree.description,
  isDeleted: tree.isDeleted,
  personCount: tree._count?.persons ?? 0,
  deletedAt: tree.deletedAt?.toISOString() ?? null,
  createdAt: tree.createdAt.toISOString(),
  updatedAt: tree.updatedAt.toISOString(),
  homePersonId: tree.homePersonId ?? null,
});

function validate(data: FamilyTreeInput) {
  const name = data.name?.trim() ?? '';
  if (!name) {
    throw new GraphQLError('The name of the family tree must not be empty.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'TREE_NAME_REQUIRED' },
    });
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new GraphQLError(`The name must be at most ${MAX_NAME_LENGTH} characters long.`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'TREE_NAME_TOO_LONG' },
    });
  }
  return { name, description: data.description?.trim() || null };
}

async function findTree(prisma: PrismaClient, id: string, isDeleted: boolean) {
  const tree = await prisma.familyTree.findFirst({ where: { id, isDeleted } });
  if (!tree) {
    throw treeNotFound();
  }
  return tree;
}

export const familyTreeResolvers = {
  Query: {
    // All family trees (without the recycle bin), by name
    familyTrees: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      // May be empty (new database, all in the recycle bin): the app then offers to create, import or restore one
      const trees = await prisma.familyTree.findMany({ where: { isDeleted: false }, orderBy: [{ name: 'asc' }, { createdAt: 'asc' }], include: WITH_COUNT });
      return trees.map(toGraphQL);
    },

    // Recycle bin: deleted family trees, most recently deleted first
    deletedFamilyTrees: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      const trees = await prisma.familyTree.findMany({ where: { isDeleted: true }, orderBy: { deletedAt: 'desc' }, include: WITH_COUNT });
      return trees.map(toGraphQL);
    },

    // Family tree this request works in (the oldest if none is given)
    activeFamilyTree: async (_: unknown, __: unknown, { prisma, treeId }: GraphQLContext) => {
      const tree = await prisma.familyTree.findUnique({ where: { id: await treeId() }, include: WITH_COUNT });
      if (!tree) {
        throw treeNotFound();
      }
      return toGraphQL(tree);
    },
  },

  Mutation: {
    createFamilyTree: async (_: unknown, { data }: { data: FamilyTreeInput }, { prisma }: GraphQLContext) =>
      toGraphQL(await prisma.familyTree.create({ data: validate(data), include: WITH_COUNT })),

    updateFamilyTree: async (_: unknown, { id, data }: { id: string; data: FamilyTreeInput }, { prisma }: GraphQLContext) => {
      await findTree(prisma, id, false);
      return toGraphQL(await prisma.familyTree.update({ where: { id }, data: validate(data), include: WITH_COUNT }));
    },

    // Home person of the active family tree (null: none); it must be a person of that tree outside the recycle bin
    setHomePerson: async (_: unknown, { personId }: { personId?: string | null }, { prisma, treeId }: GraphQLContext) => {
      const id = await treeId();
      if (personId && !(await prisma.person.findFirst({ where: { id: personId, familyTreeId: id, isDeleted: false }, select: { id: true } }))) {
        throw new GraphQLError('The person is not in this family tree.', { extensions: { code: 'BAD_USER_INPUT', reason: 'PERSON_NOT_FOUND' } });
      }
      return toGraphQL(await prisma.familyTree.update({ where: { id }, data: { homePersonId: personId || null }, include: WITH_COUNT }));
    },

    // Into the recycle bin – also the last one (the app then works without family tree); the data stays unchanged
    deleteFamilyTree: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await findTree(prisma, id, false);
      await prisma.familyTree.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      return true;
    },

    restoreFamilyTree: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await findTree(prisma, id, true);
      return toGraphQL(await prisma.familyTree.update({ where: { id }, data: { isDeleted: false, deletedAt: null }, include: WITH_COUNT }));
    },

    // Delete permanently – only from the recycle bin, with all persons, relations, life events, notes, media and imports
    hardDeleteFamilyTree: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      const tree = await prisma.familyTree.findUnique({ where: { id }, select: { isDeleted: true } });
      if (!tree) {
        throw treeNotFound();
      }
      if (!tree.isDeleted) {
        throw new GraphQLError('Only family trees in the recycle bin can be deleted permanently.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'TREE_NOT_DELETED' },
        });
      }
      const inTree = { person: { familyTreeId: id } };
      const media = await prisma.$transaction(async (tx) => {
        // An upload running at the same time has finished first: its file is in the list
        if (!(await lockTree(tx, id, true))) {
          throw treeNotFound();
        }
        const files = await tx.media.findMany({ where: { familyTreeId: id }, select: { fileName: true } });
        // Links event ↔ medium are removed by cascade together with the event or the medium
        await tx.relation.deleteMany({ where: { OR: [{ personA: { familyTreeId: id } }, { personB: { familyTreeId: id } }] } });
        await tx.media.deleteMany({ where: { familyTreeId: id } });
        await tx.event.deleteMany({ where: inTree });
        await tx.note.deleteMany({ where: inTree });
        await tx.person.deleteMany({ where: { familyTreeId: id } });
        await tx.importRecord.deleteMany({ where: { familyTreeId: id } });
        await tx.familyTree.delete({ where: { id } });
        return files;
      });
      // Remove files only after the transaction succeeded
      media.forEach((m) => removeUploadedFile(m.fileName));
      return true;
    },
  },

  FamilyTree: {
    // A person in the recycle bin or of another family tree counts as none
    homePerson: (tree: { id: string; homePersonId: string | null }, _: unknown, { prisma }: GraphQLContext) =>
      tree.homePersonId ? prisma.person.findFirst({ where: { id: tree.homePersonId, familyTreeId: tree.id, isDeleted: false } }) : null,
  },
};
