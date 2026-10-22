import { z } from 'zod';
import { CITATION_FACTS, SOURCE_TYPES } from '../../sourceValues.js';
import { storedDate } from '../dates.js';
import { McpToolError, defineTool, id, page, paged, text, type Gql } from '../tool.js';
import { compact } from './format.js';

const REPOSITORY_FIELDS = 'id name address url email phone note sourceCount';
const SOURCE_FIELDS = 'id type title author publication abbreviation text repositoryId callNumber note citationCount treeLinkCount linkCount';
const CITATION_FIELDS = 'id sourceId page date datePrecision text quality note linkCount';

/** A fact a citation supports: exactly one of a person (with its fact), an event or a relation */
const target = z
  .object({
    personId: z.string().max(100).optional(),
    fact: z.enum(CITATION_FACTS).optional().describe('With personId: GENERAL (default), NAME, BIRTH or DEATH'),
    eventId: z.string().max(100).optional(),
    relationId: z.string().max(100).optional(),
  })
  .describe('What the citation supports: a person (with fact), a life event or a relation');

const targetInput = (t: z.infer<typeof target>) => compact({ ...t, fact: t.personId ? (t.fact ?? 'GENERAL') : undefined });

interface SourceRow {
  id: string;
  type: string;
  title: string;
  author: string | null;
  publication: string | null;
  abbreviation: string | null;
  text: string | null;
  repositoryId: string | null;
  callNumber: string | null;
  note: string | null;
}

async function loadSource(gql: Gql, sourceId: string) {
  const { source } = await gql<{ source: (SourceRow & Record<string, unknown>) | null }>(
    `query ($id: ID!) { source(id: $id) { ${SOURCE_FIELDS} repository { id name } media { id originalFileName }
      citations { ${CITATION_FIELDS} media { id originalFileName } links { kind fact eventId eventTitle relationId relationType familyTreeName person { id firstName lastName } otherPerson { id firstName lastName } } } } }`,
    { id: sourceId },
  );
  if (!source) {
    throw new McpToolError('SOURCE_NOT_FOUND', `No source with id ${sourceId}.`);
  }
  return source;
}

export const listSources = defineTool({
  name: 'list_sources',
  title: 'List sources',
  description:
    'Lists the sources (church books, registers, documents …) of the library shared by all family trees, 50 per page; scope TREE: the ones this family tree uses plus unused ones, ALL: all.',
  area: 'sources',
  level: 'read',
  inTree: true,
  input: { scope: z.enum(['TREE', 'ALL']).optional(), query: z.string().max(200).optional().describe('Words the source must contain'), page },
  run: async ({ scope = 'TREE', query, page: pageNumber }, { gql }) => {
    const rows = query
      ? (await gql<{ searchSources: SourceRow[] }>(`query ($q: String!) { searchSources(query: $q) { ${SOURCE_FIELDS} } }`, { q: query })).searchSources
      : (await gql<{ sources: SourceRow[] }>(`query ($scope: String) { sources(scope: $scope) { ${SOURCE_FIELDS} } }`, { scope })).sources;
    const result = paged(rows, pageNumber);
    return { data: { ...result, items: result.items.map((row) => compact({ ...row, text: undefined })) } };
  },
});

export const getSource = defineTool({
  name: 'get_source',
  title: 'Get a source',
  description: 'A source with its archive, scans and citations, and the facts each citation supports.',
  area: 'sources',
  level: 'read',
  inTree: true,
  input: { id: id('Id of the source') },
  run: async ({ id: sourceId }, { gql }) => ({ data: compact(await loadSource(gql, sourceId)) }),
});

export const listRepositories = defineTool({
  name: 'list_repositories',
  title: 'List archives',
  description: 'Archives, libraries, registry offices and websites where sources are kept.',
  area: 'sources',
  level: 'read',
  input: {},
  run: async (_args, { gql }) => {
    const { repositories } = await gql<{ repositories: Array<Record<string, unknown>> }>(`query { repositories { ${REPOSITORY_FIELDS} } }`);
    return { data: repositories.map((r) => compact(r)) };
  },
});

const REPOSITORY_INPUT = {
  address: text('Postal address'),
  url: text('Web address'),
  email: text('E-mail'),
  phone: text('Phone'),
  note: text('Note'),
};

export const createRepository = defineTool({
  name: 'create_repository',
  title: 'Create an archive',
  description: 'Creates an archive, library, registry office or website where sources are kept.',
  area: 'sources',
  level: 'write',
  input: { name: z.string().min(1).max(500), ...REPOSITORY_INPUT },
  run: async (args, { gql }) => {
    const { createRepository: created } = await gql<{ createRepository: { id: string; name: string } }>(
      `mutation ($data: RepositoryInput!) { createRepository(data: $data) { ${REPOSITORY_FIELDS} } }`,
      { data: args },
    );
    return { data: compact(created), target: created.name };
  },
});

export const updateRepository = defineTool({
  name: 'update_repository',
  title: 'Change an archive',
  description: 'Changes an archive; fields not given keep their value, "" clears a field.',
  area: 'sources',
  level: 'write',
  input: { id: id('Id of the archive'), name: z.string().min(1).max(500).optional(), ...REPOSITORY_INPUT },
  run: async ({ id: repositoryId, ...args }, { gql }) => {
    const { repositories } = await gql<{ repositories: Array<Record<string, unknown> & { id: string }> }>(`query { repositories { ${REPOSITORY_FIELDS} } }`);
    const current = repositories.find((r) => r.id === repositoryId);
    if (!current) {
      throw new McpToolError('REPOSITORY_NOT_FOUND', `No archive with id ${repositoryId}.`);
    }
    const data = Object.fromEntries(
      ['name', 'address', 'url', 'email', 'phone', 'note'].map((key) => [key, key in args ? (args as Record<string, unknown>)[key] : current[key]]),
    );
    const { updateRepository: changed } = await gql<{ updateRepository: { id: string; name: string } }>(
      `mutation ($id: ID!, $data: RepositoryInput!) { updateRepository(id: $id, data: $data) { ${REPOSITORY_FIELDS} } }`,
      { id: repositoryId, data },
    );
    return { data: compact(changed), target: changed.name };
  },
});

const SOURCE_INPUT = {
  type: z.enum(SOURCE_TYPES).optional(),
  author: text('Author or issuer'),
  publication: text('Publication details'),
  abbreviation: text('Short title'),
  text: text('Transcription of the whole source'),
  repositoryId: text('Id of the archive that keeps it'),
  callNumber: text('Call number in the archive'),
  note: text('Note'),
};

const SOURCE_KEYS = ['type', 'title', 'author', 'publication', 'abbreviation', 'text', 'repositoryId', 'callNumber', 'note'] as const;

export const createSource = defineTool({
  name: 'create_source',
  title: 'Create a source',
  description: 'Creates a source in the library (shared by all family trees), e.g. a church book. Look for an existing one with list_sources first.',
  area: 'sources',
  level: 'write',
  inTree: true,
  input: { title: z.string().min(1).max(500), ...SOURCE_INPUT },
  run: async (args, { gql }) => {
    const { createSource: created } = await gql<{ createSource: SourceRow }>(
      `mutation ($data: SourceInput!) { createSource(data: $data) { ${SOURCE_FIELDS} } }`,
      {
        data: args,
      },
    );
    return { data: compact({ ...created }), target: created.title };
  },
});

export const updateSource = defineTool({
  name: 'update_source',
  title: 'Change a source',
  description: 'Changes a source; fields not given keep their value, "" clears a field.',
  area: 'sources',
  level: 'write',
  inTree: true,
  input: { id: id('Id of the source'), title: z.string().min(1).max(500).optional(), ...SOURCE_INPUT },
  run: async ({ id: sourceId, ...args }, { gql }) => {
    const current = await loadSource(gql, sourceId);
    const data = Object.fromEntries(SOURCE_KEYS.map((key) => [key, key in args ? (args as Record<string, unknown>)[key] : current[key]]));
    const { updateSource: changed } = await gql<{ updateSource: SourceRow }>(
      `mutation ($id: ID!, $data: SourceInput!) { updateSource(id: $id, data: $data) { ${SOURCE_FIELDS} } }`,
      { id: sourceId, data },
    );
    return { data: compact({ ...changed }), target: changed.title };
  },
});

const CITATION_INPUT = {
  page: text('Page, entry or folio, e.g. "p. 12, no. 34"'),
  date: text('Date of the entry, e.g. "12.06.1948", "1948" or "um 1948"; the precision follows from the form'),
  text: text('Transcription of the entry'),
  quality: z.number().int().min(0).max(3).nullable().optional().describe('0 unreliable, 1 questionable, 2 secondary, 3 primary evidence'),
  note: text('Note'),
};

const citationValues = (args: Record<string, unknown>) => {
  const values: Record<string, unknown> = { ...args };
  if (typeof args.date === 'string' || args.date === null) {
    const stored = storedDate('The date of the entry', args.date as string | null);
    values.date = stored.date;
    values.datePrecision = stored.precision;
  }
  return values;
};

export const addCitation = defineTool({
  name: 'add_citation',
  title: 'Add a citation',
  description: 'Adds a citation (an entry of a source, e.g. a baptism entry) and links it with the facts it supports in this family tree.',
  area: 'sources',
  level: 'write',
  inTree: true,
  input: { sourceId: id('Id of the source'), ...CITATION_INPUT, targets: z.array(target).max(50).optional() },
  run: async ({ sourceId, targets, ...args }, { gql }) => {
    const { createCitation } = await gql<{ createCitation: Record<string, unknown> }>(
      `mutation ($data: CitationInput!, $targets: [CitationTargetInput!]) { createCitation(data: $data, targets: $targets) { ${CITATION_FIELDS} } }`,
      { data: { sourceId, ...citationValues(args) }, targets: targets?.map(targetInput) ?? null },
    );
    return { data: compact(createCitation), target: (await loadSource(gql, sourceId)).title };
  },
});

/** The citation with its source or CITATION_NOT_FOUND: there is no query for a single citation, so it is looked up in the sources */
async function findCitation(gql: Gql, citationId: string) {
  const { sources } = await gql<{ sources: Array<{ id: string; title: string; citations: Array<Record<string, unknown> & { id: string }> }> }>(
    `query { sources(scope: "ALL") { id title citations { ${CITATION_FIELDS} } } }`,
  );
  for (const source of sources) {
    const citation = source.citations.find((c) => c.id === citationId);
    if (citation) {
      return { source, citation };
    }
  }
  throw new McpToolError('CITATION_NOT_FOUND', `No citation with id ${citationId}.`);
}

export const updateCitation = defineTool({
  name: 'update_citation',
  title: 'Change a citation',
  description: 'Changes page, date, transcription, quality or note of a citation; fields not given keep their value.',
  area: 'sources',
  level: 'write',
  inTree: true,
  input: { citationId: id('Id of the citation'), ...CITATION_INPUT },
  run: async ({ citationId, ...args }, { gql }) => {
    const { source, citation } = await findCitation(gql, citationId);
    const keys = ['page', 'date', 'datePrecision', 'text', 'quality', 'note'];
    const merged = Object.fromEntries(keys.map((key) => [key, key in args ? (args as Record<string, unknown>)[key] : citation[key]]));
    const { updateCitation: changed } = await gql<{ updateCitation: Record<string, unknown> }>(
      `mutation ($id: ID!, $data: CitationInput!) { updateCitation(id: $id, data: $data) { ${CITATION_FIELDS} } }`,
      { id: citationId, data: { sourceId: source.id, ...('date' in args ? citationValues(merged) : merged) } },
    );
    return { data: compact(changed), target: source.title };
  },
});

export const linkCitation = defineTool({
  name: 'link_citation',
  title: 'Link a citation',
  description: 'Links an existing citation with further facts of this family tree (a person and its fact, a life event or a relation).',
  area: 'sources',
  level: 'write',
  inTree: true,
  input: { citationId: id('Id of the citation'), targets: z.array(target).min(1).max(50) },
  run: async ({ citationId, targets }, { gql }) => {
    const { linkCitation: linked } = await gql<{ linkCitation: Record<string, unknown> & { sourceId: string } }>(
      `mutation ($id: ID!, $targets: [CitationTargetInput!]!) { linkCitation(citationId: $id, targets: $targets) { ${CITATION_FIELDS} } }`,
      { id: citationId, targets: targets.map(targetInput) },
    );
    return { data: compact(linked), target: (await loadSource(gql, linked.sourceId)).title };
  },
});

export const unlinkCitation = defineTool({
  name: 'unlink_citation',
  title: 'Unlink a citation',
  description: 'Removes the link between a citation and one fact; the citation itself stays.',
  area: 'sources',
  level: 'write',
  inTree: true,
  input: { citationId: id('Id of the citation'), target },
  run: async ({ citationId, target: fact }, { gql }) => {
    const { unlinkCitation: unlinked } = await gql<{ unlinkCitation: Record<string, unknown> & { sourceId: string } }>(
      `mutation ($id: ID!, $target: CitationTargetInput!) { unlinkCitation(citationId: $id, target: $target) { ${CITATION_FIELDS} } }`,
      { id: citationId, target: targetInput(fact) },
    );
    return { data: compact(unlinked), target: (await loadSource(gql, unlinked.sourceId)).title };
  },
});

export const deleteCitation = defineTool({
  name: 'delete_citation',
  title: 'Delete a citation',
  description: 'Deletes a citation for good, with its links in all family trees (it does not go into the recycle bin).',
  area: 'sources',
  level: 'delete',
  inTree: true,
  input: { citationId: id('Id of the citation') },
  run: async ({ citationId }, { gql }) => {
    const { source } = await findCitation(gql, citationId);
    await gql('mutation ($id: ID!) { deleteCitation(id: $id) }', { id: citationId });
    return { data: { deleted: true }, target: source.title };
  },
});

export const moveSourceToRecycleBin = defineTool({
  name: 'move_source_to_recycle_bin',
  title: 'Move a source or archive into the recycle bin',
  description: 'Moves a source (with its citations) or an archive into the recycle bin; the user can restore it in the app.',
  area: 'sources',
  level: 'write',
  inTree: true,
  input: { kind: z.enum(['source', 'archive']), id: id('Id of the source or archive') },
  run: async ({ kind, id: recordId }, { gql }) => {
    if (kind === 'source') {
      const { title } = await loadSource(gql, recordId);
      await gql('mutation ($id: ID!) { deleteSource(id: $id) }', { id: recordId });
      return { data: { movedToRecycleBin: true }, target: title };
    }
    await gql('mutation ($id: ID!) { deleteRepository(id: $id) }', { id: recordId });
    return { data: { movedToRecycleBin: true } };
  },
});

export const SOURCE_TOOLS = [
  listSources,
  getSource,
  listRepositories,
  createRepository,
  updateRepository,
  createSource,
  updateSource,
  addCitation,
  updateCitation,
  linkCitation,
  unlinkCitation,
  deleteCitation,
  moveSourceToRecycleBin,
];
