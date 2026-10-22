import { z } from 'zod';
import { readMcpConfig } from '../config.js';
import { ensureFreeTreeName, pickTree } from '../trees.js';
import type { McpLevel } from '../permissions.js';
import { McpToolError, defineTool, id, text, type Gql } from '../tool.js';
import { PERSON_FIELDS, fullName, personSummary, type PersonRow } from './format.js';

const TREE_FIELDS = 'id name description personCount';

export const createFamilyTree = defineTool({
  name: 'create_family_tree',
  title: 'Create a family tree',
  description: 'Creates a new, empty family tree; its name must differ from those of the other family trees.',
  area: 'familyTrees',
  level: 'write',
  input: { name: z.string().min(1).max(100), description: text('Description') },
  run: async ({ name, description }, { gql }) => {
    await ensureFreeTreeName(gql, name);
    const { createFamilyTree: tree } = await gql<{ createFamilyTree: { id: string; name: string } }>(
      `mutation ($data: FamilyTreeInput!) { createFamilyTree(data: $data) { ${TREE_FIELDS} } }`,
      { data: { name, description: description || null } },
    );
    return { data: tree, target: tree.name };
  },
});

export const renameFamilyTree = defineTool({
  name: 'rename_family_tree',
  title: 'Rename a family tree',
  description:
    'Changes the name and description of a family tree; the name must differ from those of the other family trees, a description not given keeps its value.',
  area: 'familyTrees',
  level: 'write',
  input: { familyTree: z.string().min(1).max(200).describe('Family tree (id or name)'), name: z.string().min(1).max(100), description: text('Description') },
  run: async ({ familyTree, name, description }, { gql, trees }) => {
    const tree = pickTree((await trees()) as Array<{ id: string; name: string; description?: string | null }>, familyTree);
    await ensureFreeTreeName(gql, name, tree.id);
    const { updateFamilyTree: changed } = await gql<{ updateFamilyTree: { id: string; name: string } }>(
      `mutation ($id: ID!, $data: FamilyTreeInput!) { updateFamilyTree(id: $id, data: $data) { ${TREE_FIELDS} } }`,
      { id: tree.id, data: { name, description: description === undefined ? (tree.description ?? null) : description || null } },
    );
    return { data: changed, target: changed.name };
  },
});

export const deleteFamilyTree = defineTool({
  name: 'delete_family_tree',
  title: 'Move a family tree into the recycle bin',
  description: 'Moves a family tree with all its persons into the recycle bin; the user can restore it in the app.',
  area: 'familyTrees',
  level: 'write',
  input: { familyTree: z.string().min(1).max(200).describe('Family tree (id or name)') },
  run: async ({ familyTree }, { gql, trees }) => {
    const tree = pickTree(await trees(), familyTree);
    await gql('mutation ($id: ID!) { deleteFamilyTree(id: $id) }', { id: tree.id });
    return { data: { movedToRecycleBin: true }, target: tree.name };
  },
});

/** Family trees in the recycle bin the assistant may see */
async function deletedTrees(gql: Gql) {
  const { excludedTrees } = readMcpConfig();
  const { deletedFamilyTrees } = await gql<{ deletedFamilyTrees: Array<{ id: string; name: string; deletedAt: string; personCount: number }> }>(
    'query { deletedFamilyTrees { id name deletedAt personCount } }',
  );
  return deletedFamilyTrees.filter((tree) => !excludedTrees.includes(tree.id));
}

/**
 * Relations in the recycle bin with the names of both persons ("relatedPerson is the <type> of person"); a relation
 * has no date of its own for that, its last change is when it went into the recycle bin
 */
async function namedRelations(
  gql: Gql,
  relations: Array<{ id: string; type: string; personAId: string; personBId: string; updatedAt: string }>,
  deletedPersons: PersonRow[],
) {
  const { getPersons } = await gql<{ getPersons: PersonRow[] }>(`query { getPersons { ${PERSON_FIELDS} } }`);
  const names = new Map([...getPersons, ...deletedPersons].map((p) => [p.id, fullName(p)]));
  return relations.map((r) => ({
    id: r.id,
    type: r.type,
    personId: r.personAId,
    person: names.get(r.personAId) ?? null,
    relatedPersonId: r.personBId,
    relatedPerson: names.get(r.personBId) ?? null,
    deletedAt: r.updatedAt,
  }));
}

export const listRecycleBin = defineTool({
  name: 'list_recycle_bin',
  title: 'List the recycle bin',
  description:
    'Persons and relations ("relatedPerson is the <type> of person", with both names) of a family tree in the recycle bin, family trees in the recycle bin and, with permission, sources and archives.',
  area: 'recycleBin',
  level: 'read',
  inTree: true,
  input: {},
  run: async (_args, { gql, can }) => {
    const { getDeletedPersons, getRelations } = await gql<{
      getDeletedPersons: Array<PersonRow & { deletedAt: string }>;
      getRelations: Array<{ id: string; type: string; active: boolean; personAId: string; personBId: string; updatedAt: string }>;
    }>(`query { getDeletedPersons { ${PERSON_FIELDS} deletedAt } getRelations(includeInactive: true) { id type active personAId personBId updatedAt } }`);
    const relations = getRelations.filter((r) => !r.active);
    const data: Record<string, unknown> = {
      persons: getDeletedPersons.map((p) => ({ ...personSummary(p), deletedAt: p.deletedAt })),
      relations: relations.length ? await namedRelations(gql, relations, getDeletedPersons) : [],
      familyTrees: await deletedTrees(gql),
    };
    if (can('sources', 'read')) {
      const { deletedSources, deletedRepositories } = await gql<{ deletedSources: unknown[]; deletedRepositories: unknown[] }>(
        'query { deletedSources { id title type deletedAt } deletedRepositories { id name deletedAt } }',
      );
      Object.assign(data, { sources: deletedSources, archives: deletedRepositories });
    }
    return { data };
  },
});

const KINDS = ['person', 'relation', 'familyTree', 'source', 'archive'] as const;
type Kind = (typeof KINDS)[number];

const MUTATIONS: Record<Kind, { restore: string; remove: string; fields: string }> = {
  person: { restore: 'restorePerson', remove: 'hardDeletePerson', fields: PERSON_FIELDS },
  relation: { restore: 'restoreRelation', remove: 'hardDeleteRelation', fields: 'id type personAId personBId' },
  familyTree: { restore: 'restoreFamilyTree', remove: 'hardDeleteFamilyTree', fields: TREE_FIELDS },
  source: { restore: 'restoreSource', remove: 'hardDeleteSource', fields: 'id title' },
  archive: { restore: 'restoreRepository', remove: 'hardDeleteRepository', fields: 'id name' },
};

/**
 * Sources and archives are part of the permission "sources"; a family tree must not be excluded, and deleting one for
 * good also needs "family trees: delete"
 */
async function checkKind(kind: Kind, recordId: string, gql: Gql, can: (area: 'sources' | 'familyTrees', level: McpLevel) => boolean, forGood = false) {
  if ((kind === 'source' || kind === 'archive') && !can('sources', 'write')) {
    throw new McpToolError('NOT_ALLOWED', 'The user has not allowed changing sources (settings → MCP).');
  }
  if (kind === 'familyTree' && forGood && !can('familyTrees', 'delete')) {
    throw new McpToolError('NOT_ALLOWED', 'The user has not allowed deleting family trees for good (settings → MCP).');
  }
  if (kind === 'familyTree' && !(await deletedTrees(gql)).some((tree) => tree.id === recordId)) {
    throw new McpToolError('TREE_NOT_FOUND', `No family tree with id ${recordId} in the recycle bin.`);
  }
}

const label = (record: Record<string, unknown>) =>
  typeof record.firstName === 'string' ? fullName(record as unknown as PersonRow) : String(record.name ?? record.title ?? record.type ?? '');

export const restoreFromRecycleBin = defineTool({
  name: 'restore_from_recycle_bin',
  title: 'Restore from the recycle bin',
  description: 'Restores a person, relation or source (in this family tree), a family tree or an archive from the recycle bin.',
  area: 'recycleBin',
  level: 'write',
  inTree: true,
  input: { kind: z.enum(KINDS), id: id('Id of the record') },
  run: async ({ kind, id: recordId }, { gql, can }) => {
    await checkKind(kind, recordId, gql, can);
    const { restore, fields } = MUTATIONS[kind];
    const result = await gql<Record<string, Record<string, unknown>>>(`mutation ($id: ID!) { ${restore}(id: $id) { ${fields} } }`, { id: recordId });
    const record = result[restore];
    return { data: record.firstName ? personSummary(record as unknown as PersonRow) : record, target: label(record) };
  },
});

export const deleteForGood = defineTool({
  name: 'delete_for_good',
  title: 'Delete for good',
  description:
    'Deletes a record that is in the recycle bin for good – a person, relation, family tree (with all its data; needs "family trees: delete" too), source or archive. Cannot be undone.',
  area: 'recycleBin',
  level: 'delete',
  inTree: true,
  input: { kind: z.enum(KINDS), id: id('Id of the record in the recycle bin') },
  run: async ({ kind, id: recordId }, { gql, can }) => {
    await checkKind(kind, recordId, gql, can, true);
    const { remove } = MUTATIONS[kind];
    await gql(`mutation ($id: ID!) { ${remove}(id: $id) }`, { id: recordId });
    return { data: { deleted: true } };
  },
});

export const TRASH_TOOLS = [createFamilyTree, renameFamilyTree, deleteFamilyTree, listRecycleBin, restoreFromRecycleBin, deleteForGood];
