import type { MockedResponse } from '@apollo/client/testing';
import { GET_PERSON_CITATIONS } from '@/features/sources/graphql/sourceQueries';

/** The citations of a person for the marks at name, birth, death, events and relations (none by default) */
export const personCitationsMock = (personId: string, personCitations: unknown[] = []): MockedResponse => ({
  request: { query: GET_PERSON_CITATIONS, variables: { personId } },
  result: { data: { personCitations } },
  maxUsageCount: Infinity,
});

/** One citation of a source, as the person page receives it */
export const factCitation = (
  kind: 'PERSON' | 'EVENT' | 'RELATION',
  target: { fact?: string; eventId?: string; relationId?: string },
  id = 'c1',
  links: unknown[] = [],
) => ({
  __typename: 'FactCitation',
  kind,
  fact: target.fact ?? null,
  eventId: target.eventId ?? null,
  relationId: target.relationId ?? null,
  citation: {
    __typename: 'Citation',
    id,
    sourceId: 's1',
    page: 'S. 12',
    date: null,
    datePrecision: null,
    text: 'Getauft am …',
    quality: 3,
    note: null,
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
    linkCount: 2,
    media: [],
    links,
    source: { __typename: 'Source', id: 's1', title: 'Kirchenbuch St. Martin', type: 'CHURCH_BOOK', abbreviation: null, repository: null },
  },
});

const stamps = { createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:00:00.000Z' };

/** Complete source for GraphQL mocks (all fields of SourceFields) */
export const makeSource = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'Source',
  id: 's1',
  type: 'CHURCH_BOOK',
  title: 'Kirchenbuch St. Martin',
  author: null,
  publication: null,
  abbreviation: null,
  text: null,
  repositoryId: null,
  repository: null,
  callNumber: null,
  note: null,
  isDeleted: false,
  deletedAt: null,
  ...stamps,
  citationCount: 1,
  linkCount: 1,
  treeLinkCount: 1,
  media: [],
  ...overrides,
});

/** Complete citation for GraphQL mocks (all fields of CitationFields) */
export const makeCitation = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'Citation',
  id: 'c1',
  sourceId: 's1',
  page: 'S. 12',
  date: null,
  datePrecision: null,
  text: null,
  quality: null,
  note: null,
  ...stamps,
  linkCount: 1,
  media: [],
  ...overrides,
});

/** Complete archive for GraphQL mocks */
export const makeRepository = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'Repository',
  id: 'r1',
  name: 'Standesamt Musterstadt',
  address: null,
  url: null,
  email: null,
  phone: null,
  note: null,
  isDeleted: false,
  deletedAt: null,
  ...stamps,
  sourceCount: 1,
  ...overrides,
});
