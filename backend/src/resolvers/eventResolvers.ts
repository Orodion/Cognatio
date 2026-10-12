import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../generated/prisma/client.js';
import { personInTree, type GraphQLContext } from '../lib/treeScope.js';
import { EVENT_CATEGORIES, validateDatePrecision } from '../lib/personValues.js';
import { isoTimes } from './timestamps.js';

interface EventInput {
  personId: string;
  date?: string;
  datePrecision?: string;
  title: string;
  category: string;
  description?: string;
  place?: string;
  sortOrder?: number;
  /** Linked media (also of other persons); without a value the links stay unchanged */
  mediaIds?: string[] | null;
}

type UpdateEventInput = Omit<EventInput, 'personId'>;

// Load linked media right away – the timeline shows them at every event
const WITH_MEDIA = { media: { include: { media: true }, orderBy: { createdAt: 'asc' } } } as const;

type EventWithLinks<T> = T & { media?: Array<{ media: unknown }> };

/** Replace the links (EventMedia) with the media themselves */
function withMediaList<T>(event: EventWithLinks<T>) {
  return event.media ? { ...event, media: event.media.map((link) => link.media) } : event;
}

function validateCategory(category: string) {
  if (!(EVENT_CATEGORIES as readonly string[]).includes(category)) {
    throw new GraphQLError(`Invalid category "${category}". Allowed: ${EVENT_CATEGORIES.join(', ')}`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_CATEGORY' },
    });
  }
}

/** Remove duplicates and check that all media exist in the active family tree */
async function checkMediaIds(prisma: PrismaClient, treeId: string, mediaIds: string[] | null | undefined) {
  if (!mediaIds) {
    return null;
  }
  const ids = [...new Set(mediaIds)];
  if (!ids.length) {
    return ids;
  }
  const found = await prisma.media.count({ where: { id: { in: ids }, familyTreeId: treeId } });
  if (found !== ids.length) {
    throw new GraphQLError('At least one medium does not exist.', {
      extensions: { code: 'BAD_USER_INPUT', reason: 'MEDIA_NOT_FOUND' },
    });
  }
  return ids;
}

/** Event of the active family tree */
async function assertEventInTree(prisma: PrismaClient, treeId: string, id: string) {
  const event = await prisma.event.findFirst({ where: { id, person: { familyTreeId: treeId } }, select: { id: true } });
  if (!event) {
    throw new GraphQLError('Event does not exist.', {
      extensions: { code: 'NOT_FOUND', reason: 'EVENT_NOT_FOUND' },
    });
  }
}

export const eventResolvers = {
  Query: {
    // All events of a person, sorted chronologically
    getEvents: async (_: unknown, { personId }: { personId: string }, { prisma, treeId }: GraphQLContext) => {
      const events = await prisma.event.findMany({
        where: { personId, person: { familyTreeId: await treeId() } },
        orderBy: [{ sortOrder: 'asc' }, { date: 'asc' }, { createdAt: 'asc' }],
        include: WITH_MEDIA,
      });
      return events.map(withMediaList);
    },
  },

  Event: {
    ...isoTimes('createdAt', 'updatedAt'),
    media: async (event: { id: string; media?: unknown[] }, _: unknown, { prisma }: GraphQLContext) => {
      if (event.media) {
        return event.media;
      }
      const links = await prisma.eventMedia.findMany({
        where: { eventId: event.id },
        include: { media: true },
        orderBy: { createdAt: 'asc' },
      });
      return links.map((link) => link.media);
    },
    person: (event: { personId: string }, _: unknown, { prisma }: GraphQLContext) => prisma.person.findUnique({ where: { id: event.personId } }),
  },

  Mutation: {
    // Create a new event
    createEvent: async (_: unknown, { data }: { data: EventInput }, { prisma, treeId }: GraphQLContext) => {
      if (!data.title || !data.title.trim()) {
        throw new GraphQLError('Title must not be empty.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'TITLE_REQUIRED' },
        });
      }
      validateCategory(data.category);
      validateDatePrecision(data.datePrecision, 'datePrecision');

      // The person must exist in the active family tree
      const tree = await treeId();
      await personInTree(prisma, tree, data.personId);
      const mediaIds = await checkMediaIds(prisma, tree, data.mediaIds);

      const event = await prisma.event.create({
        data: {
          personId: data.personId,
          title: data.title.trim(),
          category: data.category,
          date: data.date ?? null,
          datePrecision: data.datePrecision ?? null,
          description: data.description ?? null,
          place: data.place ?? null,
          sortOrder: data.sortOrder ?? null,
          ...(mediaIds?.length ? { media: { create: mediaIds.map((mediaId) => ({ mediaId })) } } : {}),
        },
        include: WITH_MEDIA,
      });
      return withMediaList(event);
    },

    // Update an event
    updateEvent: async (_: unknown, { id, data }: { id: string; data: UpdateEventInput }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      await assertEventInTree(prisma, tree, id);
      if (!data.title || !data.title.trim()) {
        throw new GraphQLError('Title must not be empty.', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'TITLE_REQUIRED' },
        });
      }
      if (data.category) {
        validateCategory(data.category);
      }
      validateDatePrecision(data.datePrecision, 'datePrecision');
      const mediaIds = await checkMediaIds(prisma, tree, data.mediaIds);

      const event = await prisma.event.update({
        where: { id },
        data: {
          title: data.title.trim(),
          category: data.category,
          date: data.date ?? null,
          datePrecision: data.datePrecision ?? null,
          description: data.description ?? null,
          place: data.place ?? null,
          sortOrder: data.sortOrder ?? null,
          // Keep existing links (ordered by when they were linked), add missing ones
          ...(mediaIds
            ? {
                media: {
                  deleteMany: { mediaId: { notIn: mediaIds } },
                  createMany: { data: mediaIds.map((mediaId) => ({ mediaId })), skipDuplicates: true },
                },
              }
            : {}),
        },
        include: WITH_MEDIA,
      });
      return withMediaList(event);
    },

    // Delete an event – the links are dropped, the media themselves are kept
    deleteEvent: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      await assertEventInTree(prisma, await treeId(), id);
      await prisma.event.delete({ where: { id } });
      return true;
    },
  },
};
