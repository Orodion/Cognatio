import { z } from 'zod';
import { parentChildOf } from '../../../resolvers/relationResolvers.js';
import { shownDay, yearOf } from '../dates.js';
import { defaultTree, type ListedTree } from '../trees.js';
import { McpToolError, defineTool, id, page, paged, type Gql } from '../tool.js';
import { PERSON_DETAILS, PERSON_FIELDS, byName, compact, fullName, isLiving, personSummary, type PersonRow } from './format.js';
import { issueSentence } from '../../plausibility/plausibility.js';
import type { Issue } from '../../plausibility/checks.js';

/** Most generations get_ancestors and get_descendants go */
const MAX_GENERATIONS = 10;
/** Most persons they list */
const MAX_RELATIVES = 500;

const ROLE_GROUPS: Record<string, string> = {
  FATHER: 'parents',
  MOTHER: 'parents',
  PARENT: 'parents',
  HUSBAND: 'partners',
  WIFE: 'partners',
  SPOUSE: 'partners',
  LIFE_PARTNER: 'partners',
  PARTNER: 'partners',
  CHILD: 'children',
  SIBLING: 'siblings',
};

interface RelationDetail {
  id: string;
  type: string;
  role: string;
  label: string | null;
  note: string | null;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  otherPerson: PersonRow;
}

/** The person or PERSON_NOT_FOUND */
export async function loadPerson(gql: Gql, personId: string, fields = PERSON_FIELDS): Promise<PersonRow & Record<string, unknown>> {
  const { getPerson } = await gql<{ getPerson: (PersonRow & Record<string, unknown>) | null }>(`query ($id: ID!) { getPerson(id: $id) { ${fields} } }`, {
    id: personId,
  });
  if (!getPerson) {
    throw new McpToolError('PERSON_NOT_FOUND', `No person with id ${personId} in this family tree.`);
  }
  return getPerson;
}

const relationsOf = (gql: Gql, personId: string) =>
  gql<{ getPersonRelations: RelationDetail[] }>(
    `query ($id: ID!) { getPersonRelations(personId: $id) { id type role label note active startDate endDate otherPerson { ${PERSON_FIELDS} } } }`,
    { id: personId },
  ).then((data) => data.getPersonRelations);

const relationEntry = (rel: RelationDetail) => ({
  relationId: rel.id,
  role: rel.role,
  person: personSummary(rel.otherPerson),
  ...compact({ label: rel.label, startDate: shownDay(rel.startDate), endDate: shownDay(rel.endDate), note: rel.note }),
  ...(rel.active ? {} : { inRecycleBin: true }),
});

/** Parents, partners, children, siblings and other relations of a person */
function familyOf(relations: RelationDetail[]) {
  const groups: Record<string, Array<ReturnType<typeof relationEntry>>> = { parents: [], partners: [], children: [], siblings: [], other: [] };
  for (const rel of relations.filter((r) => r.active)) {
    groups[ROLE_GROUPS[rel.role] ?? 'other'].push(relationEntry(rel));
  }
  return groups;
}

export const listFamilyTrees = defineTool({
  name: 'list_family_trees',
  title: 'List family trees',
  description:
    'Lists the family trees with their number of persons and their home person (the start of the ancestor figures, the reports and the family tree page); "default" marks the one used when a tool names no family tree.',
  area: 'familyTrees',
  level: 'read',
  input: {},
  run: async (_args, { trees }) => {
    const visible = (await trees()) as Array<Awaited<ReturnType<typeof trees>>[number] & Partial<ListedTree>>;
    const fallback = defaultTree(visible);
    return {
      data: visible.map((tree) => ({
        id: tree.id,
        name: tree.name,
        ...compact({ description: tree.description }),
        persons: tree.personCount,
        ...compact({ homePerson: tree.homePerson ? { id: tree.homePerson.id, name: fullName(tree.homePerson) } : undefined }),
        default: tree.id === fallback?.id,
      })),
    };
  },
});

export const search = defineTool({
  name: 'search',
  title: 'Search',
  description:
    'Finds persons by name (also phonetically: "Maier" finds "Meyer"), places, occupation, life events and notes; with permission also sources. At most 20 of each, best first.',
  area: 'persons',
  level: 'read',
  inTree: true,
  input: { query: z.string().min(1).max(200).describe('Words to look for, e.g. "Anna Kraft Leipzig"') },
  run: async ({ query }, { gql, can }) => {
    const { search: hits } = await gql<{ search: Array<{ person: PersonRow; matchedIn: string[] }> }>(
      `query ($q: String!) { search(query: $q) { matchedIn person { ${PERSON_FIELDS} } } }`,
      { q: query },
    );
    const persons = hits.slice(0, 20).map((hit) => ({ ...personSummary(hit.person), matchedIn: hit.matchedIn }));
    if (!can('sources', 'read')) {
      return { data: { persons } };
    }
    const { searchSources } = await gql<{ searchSources: Array<{ id: string; title: string; type: string; abbreviation: string | null }> }>(
      'query ($q: String!) { searchSources(query: $q) { id title type abbreviation } }',
      { q: query },
    );
    return { data: { persons, sources: searchSources.map((s) => compact(s)) } };
  },
});

export const listPersons = defineTool({
  name: 'list_persons',
  title: 'List persons',
  description: 'Lists the persons of a family tree, 50 per page, sorted by last and first name; optionally filtered.',
  area: 'persons',
  level: 'read',
  inTree: true,
  input: {
    name: z.string().max(200).optional().describe('Part of a name (first, middle, last, birth name or nickname)'),
    living: z.boolean().optional().describe('true: only living persons, false: only dead ones'),
    bornFrom: z.number().int().optional().describe('Born in this year or later'),
    bornTo: z.number().int().optional().describe('Born in this year or earlier'),
    place: z.string().max(200).optional().describe('Part of the place of birth or death'),
    page,
  },
  run: async ({ name, living, bornFrom, bornTo, place, page: pageNumber }, { gql }) => {
    const { getPersons } = await gql<{ getPersons: PersonRow[] }>(`query { getPersons { ${PERSON_FIELDS} } }`);
    const nameText = name?.toLowerCase();
    const placeText = place?.toLowerCase();
    const matches = getPersons.filter((p) => {
      const born = yearOf(p.birthDate);
      const names = [p.firstName, p.middleName, p.lastName, p.birthName, p.nickname].join(' ').toLowerCase();
      return (
        (!nameText || names.includes(nameText)) &&
        (living === undefined || isLiving(p) === living) &&
        (bornFrom === undefined || (born !== null && born >= bornFrom)) &&
        (bornTo === undefined || (born !== null && born <= bornTo)) &&
        (!placeText || [p.birthPlace, p.deathPlace].join(' ').toLowerCase().includes(placeText))
      );
    });
    const result = paged([...matches].sort(byName), pageNumber);
    return { data: { ...result, items: result.items.map(personSummary) } };
  },
});

export const getPerson = defineTool({
  name: 'get_person',
  title: 'Get a person',
  description:
    'All fields of a person with life events, notes, relations (parents, partners, children, siblings) and, with permission, citations and media files.',
  area: 'persons',
  level: 'read',
  inTree: true,
  input: { id: id('Id of the person') },
  run: async ({ id: personId }, { gql, can }) => {
    const person = await loadPerson(gql, personId, PERSON_DETAILS);
    const withMedia = can('media', 'read');
    const { getEvents, getNotes } = await gql<{
      getEvents: Array<Record<string, unknown>>;
      getNotes: Array<{ id: string; text: string; updatedAt: string }>;
    }>(
      `query ($id: ID!) {
        getEvents(personId: $id) { id title category date datePrecision place description ${withMedia ? 'media { id originalFileName }' : ''} }
        getNotes(personId: $id) { id text updatedAt }
      }`,
      { id: personId },
    );
    const relations = await relationsOf(gql, personId);
    const extra: Record<string, unknown> = {};
    if (can('sources', 'read')) {
      const { personCitations } = await gql<{ personCitations: Array<Record<string, unknown>> }>(
        `query ($id: ID!) { personCitations(personId: $id) { kind fact eventId relationId citation { id page quality text source { id title } } } }`,
        { id: personId },
      );
      extra.citations = personCitations.map((c) => compact(c));
    }
    if (withMedia) {
      const { getPersonMedia } = await gql<{ getPersonMedia: Array<Record<string, unknown>> }>(
        'query ($id: ID!) { getPersonMedia(personId: $id) { id originalFileName mimeType type sizeBytes } }',
        { id: personId },
      );
      extra.media = getPersonMedia;
    }
    return {
      data: {
        ...compact({ ...person, name: fullName(person), living: isLiving(person) }),
        events: getEvents.map((e) => compact(e)),
        notes: getNotes,
        family: familyOf(relations),
        ...extra,
      },
    };
  },
});

export const getFamily = defineTool({
  name: 'get_family',
  title: 'Get the family of a person',
  description: 'Parents, partners, children and siblings of a person, each with the id of the relation.',
  area: 'persons',
  level: 'read',
  inTree: true,
  input: { id: id('Id of the person') },
  run: async ({ id: personId }, { gql }) => {
    const person = await loadPerson(gql, personId);
    return { data: { person: personSummary(person), ...familyOf(await relationsOf(gql, personId)) } };
  },
});

/** Parents and children of every person of the family tree (active relations) */
async function lineage(gql: Gql) {
  const { getPersons, getRelations } = await gql<{ getPersons: PersonRow[]; getRelations: Array<{ personAId: string; personBId: string; type: string }> }>(
    `query { getPersons { ${PERSON_FIELDS} } getRelations { personAId personBId type } }`,
  );
  const persons = new Map(getPersons.map((p) => [p.id, p]));
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const rel of getRelations) {
    const pc = parentChildOf(rel);
    if (pc && persons.has(pc.parentId) && persons.has(pc.childId)) {
      parents.set(pc.childId, [...new Set([...(parents.get(pc.childId) ?? []), pc.parentId])]);
      children.set(pc.parentId, [...new Set([...(children.get(pc.parentId) ?? []), pc.childId])]);
    }
  }
  return { persons, parents, children };
}

/** Persons reached generation by generation (each person once, at its nearest generation) */
function walk(start: string, next: Map<string, string[]>, generations: number) {
  const found: Array<{ generation: number; id: string }> = [];
  const seen = new Set([start]);
  let current = [start];
  for (let generation = 1; generation <= generations && current.length && found.length < MAX_RELATIVES; generation++) {
    const following = current.flatMap((personId) => next.get(personId) ?? []).filter((personId) => !seen.has(personId));
    following.forEach((personId) => seen.add(personId));
    found.push(...following.map((personId) => ({ generation, id: personId })));
    current = following;
  }
  return found.slice(0, MAX_RELATIVES);
}

const relativesTool = (direction: 'ancestors' | 'descendants') =>
  defineTool({
    name: `get_${direction}`,
    title: direction === 'ancestors' ? 'Get the ancestors' : 'Get the descendants',
    description: `The ${direction} of a person up to n generations (at most ${MAX_GENERATIONS}; at most ${MAX_RELATIVES} persons), with the generation (1 = ${
      direction === 'ancestors' ? 'parents' : 'children'
    }).`,
    area: 'persons',
    level: 'read',
    inTree: true,
    input: {
      id: id('Id of the person'),
      generations: z.number().int().min(1).max(MAX_GENERATIONS).optional().describe('Number of generations (default 4)'),
    },
    run: async ({ id: personId, generations = 4 }, { gql }) => {
      const { persons, parents, children } = await lineage(gql);
      const person = persons.get(personId);
      if (!person) {
        throw new McpToolError('PERSON_NOT_FOUND', `No person with id ${personId} in this family tree.`);
      }
      const found = walk(personId, direction === 'ancestors' ? parents : children, generations);
      return {
        data: {
          person: personSummary(person),
          [direction]: found.map((entry) => ({ generation: entry.generation, ...personSummary(persons.get(entry.id)!) })),
        },
      };
    },
  });

export const getAncestors = relativesTool('ancestors');
export const getDescendants = relativesTool('descendants');

export const findDuplicates = defineTool({
  name: 'find_duplicates',
  title: 'Find possible duplicates',
  description: 'Persons that may be the same as a given person (by id) or as a name with birth date – the check the app makes before creating a person.',
  area: 'persons',
  level: 'read',
  inTree: true,
  input: {
    personId: z.string().max(100).optional().describe('Id of a person whose duplicates are looked for'),
    firstName: z.string().max(200).optional(),
    lastName: z.string().max(200).optional(),
    birthName: z.string().max(200).optional(),
    birthDate: z.string().max(100).optional(),
  },
  run: async (args, { gql }) => {
    const person = args.personId ? await loadPerson(gql, args.personId) : null;
    const firstName = person?.firstName ?? args.firstName;
    if (!firstName) {
      throw new McpToolError('BAD_INPUT', 'Give personId or at least firstName.');
    }
    const { similarPersons } = await gql<{ similarPersons: PersonRow[] }>(
      `query ($firstName: String!, $lastName: String, $birthName: String, $birthDate: String, $excludeId: ID) {
        similarPersons(firstName: $firstName, lastName: $lastName, birthName: $birthName, birthDate: $birthDate, excludeId: $excludeId) { ${PERSON_FIELDS} }
      }`,
      {
        firstName,
        lastName: person?.lastName ?? args.lastName ?? null,
        birthName: person?.birthName ?? args.birthName ?? null,
        birthDate: person?.birthDate ?? args.birthDate ?? null,
        excludeId: person?.id ?? null,
      },
    );
    return { data: similarPersons.map(personSummary) };
  },
});

interface IssueRow extends Omit<Issue, 'personIds'> {
  key: string;
  checked: boolean;
  persons: PersonRow[];
}

export const listPossibleErrors = defineTool({
  name: 'list_possible_errors',
  title: 'List possible errors',
  description:
    'Facts of the family tree that are allowed but rarely true, as the page "Possible errors" of the app shows them: a man as mother, a partner who is also a child or sibling, a parent younger than 12 or a mother older than 55 at the birth, events after the death, possible duplicates, persons who are their own ancestors … Issues the user marked as right are left out unless includeChecked.',
  area: 'persons',
  level: 'read',
  inTree: true,
  input: { includeChecked: z.boolean().optional().describe('Also the issues the user marked as right'), page },
  run: async ({ includeChecked, page: pageNumber }, { gql }) => {
    const { plausibilityIssues } = await gql<{ plausibilityIssues: IssueRow[] }>(
      `query { plausibilityIssues { key code checked relationId eventId role gender kinship age inexact count event persons { ${PERSON_FIELDS} } } }`,
    );
    const shown = plausibilityIssues.filter((issue) => includeChecked || !issue.checked);
    return {
      data: paged(
        shown.map(({ persons, ...issue }) => {
          const names = new Map(persons.map((p) => [p.id, fullName(p)]));
          const personIds = persons.map((p) => p.id);
          return {
            text: issueSentence({ ...issue, personIds } as Issue, (id) => names.get(id) ?? id),
            code: issue.code,
            checked: issue.checked,
            persons: persons.map(personSummary),
            ...(issue.relationId && { relationId: issue.relationId }),
            ...(issue.eventId && { eventId: issue.eventId }),
          };
        }),
        pageNumber,
      ),
    };
  },
});

export const PERSON_READ_TOOLS = [listFamilyTrees, search, listPersons, getPerson, getFamily, getAncestors, getDescendants, findDuplicates, listPossibleErrors];
