import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../generated/prisma/client.js';
import { personInTree, type GraphQLContext } from '../lib/treeScope.js';
import { isoTimes } from './timestamps.js';

interface NoteInput {
  personId: string;
  text: string;
}

type UpdateNoteInput = Omit<NoteInput, 'personId'>;

/** Upper limit of a note in characters; the frontend limits the field to the same length */
export const MAX_NOTE_LENGTH = 10_000;

/** The text of a note without surrounding blanks: not empty and not longer than the limit */
function noteText(text: string | undefined) {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    throw new GraphQLError('Note text must not be empty.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'NOTE_TEXT_REQUIRED' },
    });
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new GraphQLError(`A note must be at most ${MAX_NOTE_LENGTH} characters long.`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'NOTE_TOO_LONG' },
    });
  }
  return trimmed;
}

/** Note of the active family tree */
async function assertNoteInTree(prisma: PrismaClient, treeId: string, id: string) {
  const note = await prisma.note.findFirst({ where: { id, person: { familyTreeId: treeId } }, select: { id: true } });
  if (!note) {
    throw new GraphQLError('Note does not exist.', {
      extensions: { code: 'NOT_FOUND', reason: 'NOTE_NOT_FOUND' },
    });
  }
}

export const noteResolvers = {
  Query: {
    // All notes of a person, newest first
    getNotes: async (_: unknown, { personId }: { personId: string }, { prisma, treeId }: GraphQLContext) => {
      return prisma.note.findMany({
        where: { personId, person: { familyTreeId: await treeId() } },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    // Create a new note
    createNote: async (_: unknown, { data }: { data: NoteInput }, { prisma, treeId }: GraphQLContext) => {
      const text = noteText(data.text);

      // The person must exist in the active family tree
      await personInTree(prisma, await treeId(), data.personId);

      return prisma.note.create({
        data: {
          personId: data.personId,
          text,
        },
      });
    },

    // Update a note
    updateNote: async (_: unknown, { id, data }: { id: string; data: UpdateNoteInput }, { prisma, treeId }: GraphQLContext) => {
      const text = noteText(data.text);

      await assertNoteInTree(prisma, await treeId(), id);
      return prisma.note.update({
        where: { id },
        data: { text },
      });
    },

    // Delete a note
    deleteNote: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      await assertNoteInTree(prisma, await treeId(), id);
      await prisma.note.delete({ where: { id } });
      return true;
    },
  },

  Note: isoTimes('createdAt', 'updatedAt'),
};
