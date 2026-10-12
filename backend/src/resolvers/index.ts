import { personResolvers } from './personResolvers.js';
import { relationResolvers } from './relationResolvers.js';
import { eventResolvers } from './eventResolvers.js';
import { noteResolvers } from './noteResolvers.js';
import { mediaResolvers } from './mediaResolvers.js';
import { importResolvers } from './importResolvers.js';
import { systemResolvers } from './systemResolvers.js';
import { familyTreeResolvers } from './familyTreeResolvers.js';

// Merge all resolvers
export const resolvers = {
  Query: {
    healthCheck: () => 'Backend is running!',
    ...familyTreeResolvers.Query,
    ...personResolvers.Query,
    ...relationResolvers.Query,
    ...eventResolvers.Query,
    ...noteResolvers.Query,
    ...mediaResolvers.Query,
    ...importResolvers.Query,
    ...systemResolvers.Query,
  },
  Person: personResolvers.Person,
  Event: eventResolvers.Event,
  Media: mediaResolvers.Media,
  Note: noteResolvers.Note,
  ImportRecord: importResolvers.ImportRecord,
  Mutation: {
    ...systemResolvers.Mutation,
    ...familyTreeResolvers.Mutation,
    ...personResolvers.Mutation,
    ...relationResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...noteResolvers.Mutation,
    ...mediaResolvers.Mutation,
  },
};
