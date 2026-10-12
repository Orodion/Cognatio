import { GraphQLError } from 'graphql';
import { removeUploadedFile } from '../lib/files/uploads.js';
import { logger } from '../lib/logger.js';
import type { GraphQLContext } from '../lib/treeScope.js';
import { isoTimes } from './timestamps.js';

const log = logger.child({ component: 'media' });

export const mediaResolvers = {
  Query: {
    getPersonMedia: async (_: unknown, { personId }: { personId: string }, { prisma, treeId }: GraphQLContext) => {
      return await prisma.media.findMany({
        where: { personId, familyTreeId: await treeId() },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Media of other persons linked with events of this person (e.g. a group photo)
    getLinkedMedia: async (_: unknown, { personId }: { personId: string }, { prisma, treeId }: GraphQLContext) => {
      return await prisma.media.findMany({
        where: { familyTreeId: await treeId(), events: { some: { event: { personId } } }, NOT: { personId } },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Media: {
    ...isoTimes('createdAt', 'updatedAt'),
    // Owner of the file (for the hint "from …" at linked media)
    person: (media: { personId?: string | null }, _: unknown, { prisma }: GraphQLContext) =>
      media.personId ? prisma.person.findUnique({ where: { id: media.personId } }) : null,
    // Events the file is linked with
    events: async (media: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      const links = await prisma.eventMedia.findMany({
        where: { mediaId: media.id },
        include: { event: true },
        orderBy: { createdAt: 'asc' },
      });
      return links.map((link) => link.event);
    },
  },

  Mutation: {
    deleteMedia: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      try {
        const media = await prisma.media.findFirst({ where: { id, familyTreeId: await treeId() } });
        if (!media) {
          throw new GraphQLError(`Medium with id ${id} not found`, {
            extensions: { code: 'NOT_FOUND', reason: 'MEDIA_NOT_FOUND' },
          });
        }

        // Remove the reference as profile picture, then delete from the database and the disk
        await prisma.$transaction([
          prisma.person.updateMany({ where: { profilePictureId: id }, data: { profilePictureId: null } }),
          prisma.media.delete({ where: { id } }),
        ]);
        removeUploadedFile(media.fileName);

        return true;
      } catch (error) {
        if (!(error instanceof GraphQLError)) {
          log.error('Medium could not be deleted', { err: error, mediaId: id });
        }
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Error while deleting the medium', {
          extensions: { reason: 'MEDIA_DELETE_FAILED' },
        });
      }
    },
  },
};
