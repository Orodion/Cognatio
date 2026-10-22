import { personResolvers } from './personResolvers.js';
import { relationResolvers } from './relationResolvers.js';
import { eventResolvers } from './eventResolvers.js';
import { noteResolvers } from './noteResolvers.js';
import { mediaResolvers } from './mediaResolvers.js';
import { importResolvers } from './importResolvers.js';
import { systemResolvers } from './systemResolvers.js';
import { familyTreeResolvers } from './familyTreeResolvers.js';
import { sourceResolvers } from './sourceResolvers.js';
import { reportResolvers } from './reportResolvers.js';
import { mcpResolvers } from './mcpResolvers.js';
import { plausibilityResolvers } from './plausibilityResolvers.js';
import { statisticsResolvers } from './statisticsResolvers.js';

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
    ...sourceResolvers.Query,
    ...reportResolvers.Query,
    ...importResolvers.Query,
    ...systemResolvers.Query,
    ...mcpResolvers.Query,
    ...plausibilityResolvers.Query,
    ...statisticsResolvers.Query,
  },
  FamilyTree: familyTreeResolvers.FamilyTree,
  Person: personResolvers.Person,
  Event: eventResolvers.Event,
  Media: mediaResolvers.Media,
  Note: noteResolvers.Note,
  ImportRecord: importResolvers.ImportRecord,
  Repository: sourceResolvers.Repository,
  Source: sourceResolvers.Source,
  Citation: sourceResolvers.Citation,
  ReportPerson: reportResolvers.ReportPerson,
  Mutation: {
    ...systemResolvers.Mutation,
    ...mcpResolvers.Mutation,
    ...familyTreeResolvers.Mutation,
    ...personResolvers.Mutation,
    ...relationResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...noteResolvers.Mutation,
    ...mediaResolvers.Mutation,
    ...sourceResolvers.Mutation,
    ...plausibilityResolvers.Mutation,
  },
};
