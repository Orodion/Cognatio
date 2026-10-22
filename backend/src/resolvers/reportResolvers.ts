import { GraphQLError } from 'graphql';
import type { Person } from '../generated/prisma/index.js';
import type { GraphQLContext } from '../lib/treeScope.js';
import { eventResolvers } from './eventResolvers.js';
import { noteResolvers } from './noteResolvers.js';
import { mediaResolvers } from './mediaResolvers.js';
import { sourceResolvers } from './sourceResolvers.js';

/** At most this many persons per request – a report of a whole family tree asks in pieces */
export const MAX_REPORT_PERSONS = 500;

/**
 * Everything a report sheet shows of a person, for many persons in one request. The fields use the same queries as
 * the tabs of the person page, so order, family tree scope and the recycle bin rules are the same.
 */
export const reportResolvers = {
  Query: {
    // Persons of the active family tree in the order asked for; unknown ids and persons in the recycle bin are left out
    reportPersons: async (_: unknown, { ids }: { ids: string[] }, { prisma, treeId }: GraphQLContext) => {
      if (ids.length > MAX_REPORT_PERSONS) {
        throw new GraphQLError(`At most ${MAX_REPORT_PERSONS} persons per request`, { extensions: { code: 'BAD_USER_INPUT', reason: 'TOO_MANY_PERSONS' } });
      }
      const persons = await prisma.person.findMany({ where: { id: { in: ids }, familyTreeId: await treeId(), isDeleted: false } });
      const byId = new Map(persons.map((person) => [person.id, person]));
      return ids.flatMap((id) => (byId.has(id) ? [{ person: byId.get(id)! }] : []));
    },
  },

  ReportPerson: {
    id: ({ person }: { person: Person }) => person.id,
    events: ({ person }: { person: Person }, _: unknown, context: GraphQLContext) => eventResolvers.Query.getEvents(null, { personId: person.id }, context),
    notes: ({ person }: { person: Person }, _: unknown, context: GraphQLContext) => noteResolvers.Query.getNotes(null, { personId: person.id }, context),
    media: ({ person }: { person: Person }, _: unknown, context: GraphQLContext) => mediaResolvers.Query.getPersonMedia(null, { personId: person.id }, context),
    citations: ({ person }: { person: Person }, _: unknown, context: GraphQLContext) =>
      sourceResolvers.Query.personCitations(null, { personId: person.id }, context),
  },
};
