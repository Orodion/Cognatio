import { GraphQLError } from 'graphql';
import { eventResolvers } from '../eventResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import type { Event, Person } from '../../generated/prisma/index.js';

const ctx = testContext;

const mockEvent = {
  id: 'e1',
  personId: '1',
  date: '1985-06-15',
  datePrecision: 'EXACT',
  title: 'Geburt',
  category: 'BIRTH',
  description: 'In München geboren',
  place: 'München',
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Event;

beforeEach(() => {
  jest.clearAllMocks();
  // The event is in the active family tree
  prismaMock.event.findFirst.mockResolvedValue({ id: 'e1' } as Event);
});

describe('eventResolvers - Query', () => {
  it('should fetch all events for a person', async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([mockEvent]);

    const result = await eventResolvers.Query.getEvents(null, { personId: '1' }, ctx);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Geburt');
    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: { personId: '1', person: { familyTreeId: TEST_TREE_ID } },
      orderBy: { createdAt: 'asc' },
      include: { media: { include: { media: true }, orderBy: { createdAt: 'asc' } } },
    });
  });

  it('sorts chronologically by the sort key or the date as typed, undated last', async () => {
    const event = (id: string, date: string | null, sortOrder: number | null = null) => ({ ...mockEvent, id, date, sortOrder, media: [] });
    prismaMock.event.findMany.mockResolvedValueOnce([
      event('later', '03.11.2025'),
      event('undated', null),
      event('earlier', '14.09.1951'),
      event('about', 'about 1925'),
      event('saved', '1960', 19600101),
      event('text', 'Ostern'),
      event('same', '14.09.1951'),
    ] as never);

    const result = await eventResolvers.Query.getEvents(null, { personId: '1' }, ctx);

    expect(result.map((e) => e.id)).toEqual(['about', 'earlier', 'same', 'saved', 'later', 'undated', 'text']);
  });

  it('returns the linked media themselves instead of the links', async () => {
    const photo = { id: 'm1', fileName: 'a.jpg' };
    prismaMock.event.findMany.mockResolvedValueOnce([{ ...mockEvent, media: [{ media: photo }] }] as never);

    const [event] = await eventResolvers.Query.getEvents(null, { personId: '1' }, ctx);

    expect(event.media).toEqual([photo]);
  });

  it('should return empty array if person has no events', async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);

    const result = await eventResolvers.Query.getEvents(null, { personId: '999' }, ctx);

    expect(result).toHaveLength(0);
  });
});

describe('eventResolvers - Mutation', () => {
  describe('createEvent', () => {
    it('should create a valid event', async () => {
      prismaMock.person.findFirst.mockResolvedValueOnce({ id: '1' } as Person);
      prismaMock.event.create.mockResolvedValueOnce(mockEvent);

      const created = await eventResolvers.Mutation.createEvent(
        null,
        {
          data: {
            personId: '1',
            title: 'Geburt',
            category: 'BIRTH',
            date: '1985-06-15',
            place: 'München',
          },
        },
        ctx,
      );

      expect(created.title).toBe('Geburt');
      expect(prismaMock.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            personId: '1',
            title: 'Geburt',
            category: 'BIRTH',
          }),
        }),
      );
      expect(prismaMock.event.create.mock.calls[0][0].data).not.toHaveProperty('media');
    });

    it('links existing media, also of other persons, without duplicates', async () => {
      prismaMock.person.findFirst.mockResolvedValueOnce({ id: '1' } as Person);
      prismaMock.media.count.mockResolvedValueOnce(2);
      prismaMock.event.create.mockResolvedValueOnce({ ...mockEvent, media: [] } as never);

      await eventResolvers.Mutation.createEvent(
        null,
        { data: { personId: '1', title: 'Umzug', category: 'MOVE', mediaIds: ['karte', 'groupPhoto', 'karte'] } },
        ctx,
      );

      expect(prismaMock.media.count).toHaveBeenCalledWith({ where: { id: { in: ['karte', 'groupPhoto'] }, familyTreeId: TEST_TREE_ID } });
      expect(prismaMock.event.create.mock.calls[0][0].data).toMatchObject({
        media: { create: [{ mediaId: 'karte' }, { mediaId: 'groupPhoto' }] },
      });
    });

    it('rejects links to unknown media', async () => {
      prismaMock.person.findFirst.mockResolvedValueOnce({ id: '1' } as Person);
      prismaMock.media.count.mockResolvedValueOnce(0);

      await expect(
        eventResolvers.Mutation.createEvent(null, { data: { personId: '1', title: 'Umzug', category: 'MOVE', mediaIds: ['weg'] } }, ctx),
      ).rejects.toMatchObject({ extensions: { reason: 'MEDIA_NOT_FOUND' } });
      expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it('should reject an empty title', async () => {
      await expect(eventResolvers.Mutation.createEvent(null, { data: { personId: '1', title: '  ', category: 'BIRTH' } }, ctx)).rejects.toThrow(
        /must not be empty/,
      );
    });

    it('should reject an invalid category', async () => {
      await expect(eventResolvers.Mutation.createEvent(null, { data: { personId: '1', title: 'Test', category: 'INVALID' } }, ctx)).rejects.toThrow(
        GraphQLError,
      );
    });

    it('should reject if person does not exist', async () => {
      prismaMock.person.findFirst.mockResolvedValueOnce(null);

      await expect(eventResolvers.Mutation.createEvent(null, { data: { personId: '999', title: 'Test', category: 'BIRTH' } }, ctx)).rejects.toThrow(
        /does not exist/,
      );
    });
  });

  describe('updateEvent', () => {
    it('should update an event', async () => {
      const updated = { ...mockEvent, title: 'Geändert', place: 'Berlin' };
      prismaMock.event.update.mockResolvedValueOnce(updated);

      const result = await eventResolvers.Mutation.updateEvent(
        null,
        {
          id: 'e1',
          data: {
            title: 'Geändert',
            category: 'BIRTH',
            place: 'Berlin',
          },
        },
        ctx,
      );

      expect(result.title).toBe('Geändert');
      expect(result.place).toBe('Berlin');
      // Without mediaIds the links stay unchanged
      expect(prismaMock.event.update.mock.calls[0][0].data).not.toHaveProperty('media');
    });

    it('keeps the fields that are not passed and clears those passed as null', async () => {
      prismaMock.event.update.mockResolvedValueOnce(mockEvent);

      await eventResolvers.Mutation.updateEvent(null, { id: 'e1', data: { title: 'Umzug', category: 'MOVE', place: null, sortOrder: null } }, ctx);

      const { data } = prismaMock.event.update.mock.calls[0][0];
      expect(data).toMatchObject({ title: 'Umzug', category: 'MOVE', place: null, sortOrder: null });
      // undefined leaves the column unchanged
      expect(data.date).toBeUndefined();
      expect(data.datePrecision).toBeUndefined();
      expect(data.description).toBeUndefined();
    });

    it('replaces the links: removes missing ones and adds new ones', async () => {
      prismaMock.media.count.mockResolvedValueOnce(1);
      prismaMock.event.update.mockResolvedValueOnce({ ...mockEvent, media: [] } as never);

      await eventResolvers.Mutation.updateEvent(null, { id: 'e1', data: { title: 'Umzug', category: 'MOVE', mediaIds: ['karte'] } }, ctx);

      expect(prismaMock.event.update.mock.calls[0][0].data).toMatchObject({
        media: {
          deleteMany: { mediaId: { notIn: ['karte'] } },
          createMany: { data: [{ mediaId: 'karte' }], skipDuplicates: true },
        },
      });
    });

    it('removes all links with an empty list', async () => {
      prismaMock.event.update.mockResolvedValueOnce({ ...mockEvent, media: [] } as never);

      await eventResolvers.Mutation.updateEvent(null, { id: 'e1', data: { title: 'Umzug', category: 'MOVE', mediaIds: [] } }, ctx);

      expect(prismaMock.media.count).not.toHaveBeenCalled();
      expect(prismaMock.event.update.mock.calls[0][0].data).toMatchObject({ media: { deleteMany: { mediaId: { notIn: [] } } } });
    });
  });

  describe('Event fields', () => {
    it('loads linked media and the person if they were not loaded with the event', async () => {
      prismaMock.eventMedia.findMany.mockResolvedValueOnce([{ media: { id: 'm1' } }] as never);
      prismaMock.person.findUnique.mockResolvedValueOnce({ id: '1' } as Person);

      await expect(eventResolvers.Event.media({ id: 'e1' }, {}, ctx)).resolves.toEqual([{ id: 'm1' }]);
      await expect(eventResolvers.Event.media({ id: 'e1', media: [{ id: 'm2' }] }, {}, ctx)).resolves.toEqual([{ id: 'm2' }]);
      await expect(eventResolvers.Event.person({ personId: '1' }, {}, ctx)).resolves.toEqual({ id: '1' });
      expect(prismaMock.eventMedia.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('family tree', () => {
    it('rejects events and persons of another family tree', async () => {
      prismaMock.event.findFirst.mockResolvedValue(null);
      await expect(eventResolvers.Mutation.deleteEvent(null, { id: 'e1' }, ctx)).rejects.toMatchObject({ extensions: { reason: 'EVENT_NOT_FOUND' } });
      expect(prismaMock.event.findFirst).toHaveBeenCalledWith({ where: { id: 'e1', person: { familyTreeId: TEST_TREE_ID } }, select: { id: true } });
      expect(prismaMock.event.delete).not.toHaveBeenCalled();

      prismaMock.person.findFirst.mockResolvedValueOnce(null);
      await expect(eventResolvers.Mutation.createEvent(null, { data: { personId: 'p-other', title: 'Test', category: 'BIRTH' } }, ctx)).rejects.toMatchObject({
        extensions: { reason: 'PERSON_NOT_FOUND' },
      });
      expect(prismaMock.person.findFirst).toHaveBeenCalledWith({ where: { id: 'p-other', familyTreeId: TEST_TREE_ID } });
    });
  });

  describe('date precision', () => {
    it('refuses a precision the app does not know', async () => {
      prismaMock.event.findFirst.mockResolvedValue({ id: 'e1' } as never);
      await expect(
        eventResolvers.Mutation.createEvent(null, { data: { personId: '1', title: 'Test', category: 'BIRTH', datePrecision: 'ABOUT' } }, ctx),
      ).rejects.toMatchObject({ extensions: { reason: 'INVALID_DATE_PRECISION' } });
      await expect(
        eventResolvers.Mutation.updateEvent(null, { id: 'e1', data: { title: 'Test', category: 'BIRTH', datePrecision: 'ABOUT' } }, ctx),
      ).rejects.toMatchObject({ extensions: { reason: 'INVALID_DATE_PRECISION' } });
      expect(prismaMock.event.create).not.toHaveBeenCalled();
      expect(prismaMock.event.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      prismaMock.event.delete.mockResolvedValueOnce(mockEvent);

      const result = await eventResolvers.Mutation.deleteEvent(null, { id: 'e1' }, ctx);

      expect(result).toBe(true);
      expect(prismaMock.event.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });
  });
});
