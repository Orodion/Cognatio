import { GraphQLError } from 'graphql';
import { removeUploadedFile } from '../lib/files/uploads.js';
import { loadProfilePictureUrl } from '../lib/files/profilePictures.js';
import { personPhonetics } from '../lib/search/phonetics.js';
import { findSimilarPersons, searchPersons, type SimilarInput } from '../lib/search/search.js';
import { lockTree, personInTree, treeNotFound, type GraphQLContext } from '../lib/treeScope.js';
import { validateDatePrecision, validateGender } from '../lib/personValues.js';
import { isoTimes } from './timestamps.js';

interface PersonInput {
  firstName: string;
  lastName?: string;
  middleName?: string;
  birthName?: string;
  title?: string;
  nickname?: string;
  birthDate?: string;
  birthDatePrecision?: string;
  birthPlace?: string;
  gender?: string;
  deathDate?: string;
  deathDatePrecision?: string;
  deathPlace?: string;
  address?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  hobbies?: string;
  maritalStatus?: string;
  nationality?: string;
  languages?: string[];
  profilePictureId?: string;
}

/** Gender and date precisions take only the values the app knows (any text was accepted before) */
function validatePersonValues(data: PersonInput) {
  validateGender(data.gender);
  validateDatePrecision(data.birthDatePrecision, 'birthDatePrecision');
  validateDatePrecision(data.deathDatePrecision, 'deathDatePrecision');
}

export const personResolvers = {
  Query: {
    // All persons (by default only active ones)
    getPersons: async (_: unknown, { includeDeleted }: { includeDeleted: boolean }, { prisma, treeId }: GraphQLContext) => {
      return prisma.person.findMany({
        where: { familyTreeId: await treeId(), ...(includeDeleted ? {} : { isDeleted: false }) },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Recycle bin: deleted persons, most recently deleted first
    getDeletedPersons: async (_: unknown, __: unknown, { prisma, treeId }: GraphQLContext) => {
      return prisma.person.findMany({
        where: { familyTreeId: await treeId(), isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      });
    },

    // A single person
    getPerson: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      return prisma.person.findFirst({
        where: { id, familyTreeId: await treeId() },
      });
    },

    // Family tree of a person (also outside the active one) – so links to persons of other family trees work
    locatePerson: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      const person = await prisma.person.findFirst({ where: { id, familyTree: { isDeleted: false } }, select: { familyTreeId: true } });
      return person?.familyTreeId ?? null;
    },

    // Search across fields and phonetics, sorted by relevance
    search: async (_: unknown, { query, language }: { query: string; language?: string | null }, { prisma, treeId }: GraphQLContext) =>
      searchPersons(prisma, await treeId(), query, language),

    similarPersons: async (_: unknown, input: SimilarInput, { prisma, treeId }: GraphQLContext) => findSimilarPersons(prisma, await treeId(), input),
  },

  Mutation: {
    // Create a new person
    createPerson: async (_: unknown, { data }: { data: PersonInput }, { prisma, treeId }: GraphQLContext) => {
      validatePersonValues(data);
      // Set defaults if not given
      const createData = {
        ...data,
        familyTreeId: await treeId(),
        gender: data.gender || 'UNKNOWN',
        languages: data.languages || [],
        phonetics: personPhonetics(data),
      };

      return prisma.person.create({
        data: createData,
      });
    },

    // Update a person
    updatePerson: async (_: unknown, { id, data }: { id: string; data: PersonInput }, { prisma, treeId }: GraphQLContext) => {
      validatePersonValues(data);
      // Phonetics from the names after the change – fields not passed keep their value
      const current = await personInTree(prisma, await treeId(), id);
      return prisma.person.update({
        where: { id },
        data: { ...data, phonetics: personPhonetics({ ...current, ...data }) },
      });
    },

    // Soft delete of a person
    deletePerson: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      await personInTree(prisma, await treeId(), id);
      await prisma.person.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      return true;
    },

    // Restore after soft delete
    restorePerson: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      await personInTree(prisma, await treeId(), id);
      return prisma.person.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    },

    // Real, permanent deletion including all dependent data – only from the recycle bin
    hardDeletePerson: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      const person = await personInTree(prisma, await treeId(), id);
      if (!person.isDeleted) {
        throw new GraphQLError('Only persons in the recycle bin can be deleted permanently.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'PERSON_NOT_DELETED' },
        });
      }

      // Only delete own media – files of other persons linked with events of this person
      // are kept (the link is dropped with the event)
      const mediaWhere = { personId: id };
      const media = await prisma.$transaction(async (tx) => {
        // An upload for the person running at the same time has finished first: its file is in the list
        if (!(await lockTree(tx, person.familyTreeId))) {
          throw treeNotFound();
        }
        const files = (await tx.media.findMany({ where: mediaWhere, select: { fileName: true } })) ?? [];
        await tx.relation.deleteMany({ where: { OR: [{ personAId: id }, { personBId: id }] } });
        await tx.media.deleteMany({ where: mediaWhere });
        await tx.event.deleteMany({ where: { personId: id } });
        await tx.note.deleteMany({ where: { personId: id } });
        await tx.person.delete({ where: { id } });
        return files;
      });

      // Remove files only after the transaction succeeded
      media.forEach((m) => removeUploadedFile(m.fileName));
      return true;
    },

    // Set the profile picture (an image from the person's media) or remove it (mediaId = null)
    setProfilePicture: async (_: unknown, { personId, mediaId }: { personId: string; mediaId?: string | null }, { prisma, treeId }: GraphQLContext) => {
      await personInTree(prisma, await treeId(), personId);
      if (mediaId) {
        const media = await prisma.media.findUnique({ where: { id: mediaId } });
        if (!media || media.personId !== personId || !media.mimeType.startsWith('image/')) {
          throw new GraphQLError('Only images of this person can be used as profile picture.', {
            extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_PROFILE_PICTURE' },
          });
        }
      }
      return prisma.person.update({
        where: { id: personId },
        data: { profilePictureId: mediaId ?? null },
      });
    },
  },

  Person: {
    ...isoTimes('createdAt', 'updatedAt', 'deletedAt'),
    // URL of the profile picture so the frontend can show it without a further query
    // Deliberately not async: persons without a profile picture (the rule) create no promise –
    // with thousands of persons this saves noticeable time
    profilePictureUrl: (person: { profilePictureId?: string | null }, _: unknown, { prisma }: GraphQLContext): string | null | Promise<string | null> => {
      if (!person.profilePictureId) {
        return null;
      }
      // Batched: one query for all persons of a response
      return loadProfilePictureUrl(prisma, person.profilePictureId);
    },
  },
};
