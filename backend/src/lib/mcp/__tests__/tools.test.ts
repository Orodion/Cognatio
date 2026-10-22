import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-mcp-tools-'));
process.env.SETTINGS_FILE = path.join(mockDir, 'settings.json');

jest.mock('../../logger.js', () => {
  const actual = jest.requireActual('../../logger.js');
  return { ...actual, logger: new actual.Logger({ level: 'error', console: 'off', file: null }) };
});

import type { ToolContext, AnyTool, Gql } from '../tool.js';
import { allows, readOnlyPermissions, type McpPermissions } from '../permissions.js';
import {
  getAncestors,
  getDescendants,
  getFamily,
  getPerson,
  listPersons,
  search,
  findDuplicates,
  listFamilyTrees,
  listPossibleErrors,
} from '../tools/persons.js';
import { addEvent, addNote, createPerson, createRelation, deleteEvent, moveToRecycleBin, updateEvent, updatePerson, updateRelation } from '../tools/changes.js';
import { addCitation, getSource, listSources, updateCitation, updateRepository, updateSource } from '../tools/sources.js';
import { createFamilyTree, deleteForGood, listRecycleBin, renameFamilyTree, restoreFromRecycleBin } from '../tools/trash.js';
import { getStatistics, setSettings } from '../tools/system.js';
import { setMcpExcludedTrees } from '../config.js';

type Answer = Record<string, unknown>;

const person = (id: string, firstName: string, extra: Answer = {}) => ({
  id,
  firstName,
  lastName: 'Kraft',
  gender: 'UNKNOWN',
  birthDate: null,
  birthPlace: null,
  deathDate: null,
  deathPlace: null,
  ...extra,
});

/**
 * A fake GraphQL server: `answers` maps the first field of an operation (e.g. "getPerson") to its answer; calls are
 * recorded with their variables
 */
function fakeGql(answers: Record<string, unknown | ((vars: Answer) => unknown)>) {
  const calls: Array<{ field: string; vars: Answer }> = [];
  const gql = jest.fn(async (query: string, vars: Answer = {}) => {
    const names = Object.keys(answers).filter((name) => new RegExp(`\\b${name}\\b`).test(query));
    if (!names.length) {
      throw new Error(`unexpected query: ${query}`);
    }
    const result: Answer = {};
    for (const name of names) {
      calls.push({ field: name, vars });
      const answer = answers[name];
      result[name] = typeof answer === 'function' ? (answer as (v: Answer) => unknown)(vars) : answer;
    }
    return result;
  });
  return { gql: gql as unknown as Gql, calls };
}

function context(gql: ToolContext['gql'], permissions: McpPermissions = readOnlyPermissions()): ToolContext {
  return {
    gql,
    tree: { id: 'tree-1', name: 'Kraft' },
    can: (area, level) => allows(permissions, area, level),
    trees: async () => [
      {
        id: 'tree-1',
        name: 'Kraft',
        description: 'old',
        createdAt: '2026-01-01',
        personCount: 3,
        homePerson: { id: 'p1', firstName: 'Anna', lastName: 'Kraft' },
      } as never,
      { id: 'tree-2', name: 'Weber', description: null, createdAt: '2026-02-01', personCount: 0 } as never,
    ],
  };
}

const TREES = [
  { id: 'tree-1', name: 'Kraft' },
  { id: 'tree-2', name: 'Weber' },
];

const run = (tool: AnyTool, args: Answer, ctx: ToolContext) => tool.run(args as never, ctx);

afterAll(() => fs.rmSync(mockDir, { recursive: true, force: true }));

describe('reading', () => {
  const anna = person('p1', 'Anna', { gender: 'FEMALE', birthDate: '14.09.1951', birthPlace: 'Leipzig' });
  const karl = person('p2', 'Karl', { gender: 'MALE', birthDate: '1920', deathDate: '1990' });
  const greta = person('p3', 'Greta', { birthDate: 'um 1895', deathDate: '1960' });

  it('lists family trees with the default one', async () => {
    const { data } = await run(listFamilyTrees, {}, context(fakeGql({}).gql));
    expect(data).toEqual([
      { id: 'tree-1', name: 'Kraft', description: 'old', persons: 3, homePerson: { id: 'p1', name: 'Anna Kraft' }, default: true },
      { id: 'tree-2', name: 'Weber', persons: 0, default: false },
    ]);
  });

  it('filters and pages persons', async () => {
    const { gql } = fakeGql({ getPersons: [anna, karl, greta] });
    const living = await run(listPersons, { living: true }, context(gql));
    expect((living.data as { items: Answer[] }).items.map((p) => p.id)).toEqual(['p1']);
    const born = await run(listPersons, { bornFrom: 1890, bornTo: 1925 }, context(gql));
    expect((born.data as { items: Answer[] }).items.map((p) => p.id)).toEqual(['p3', 'p2']);
    const place = await run(listPersons, { place: 'leip', name: 'ann' }, context(gql));
    expect((place.data as { total: number }).total).toBe(1);
  });

  it('searches persons and – with permission – sources', async () => {
    const { gql } = fakeGql({
      search: [{ person: anna, matchedIn: ['NAME'] }],
      searchSources: [{ id: 's1', title: 'Kirchenbuch', type: 'CHURCH_BOOK', abbreviation: null }],
    });
    const withSources = await run(search, { query: 'Anna' }, context(gql));
    expect(withSources.data).toEqual({
      persons: [expect.objectContaining({ id: 'p1', matchedIn: ['NAME'] })],
      sources: [{ id: 's1', title: 'Kirchenbuch', type: 'CHURCH_BOOK' }],
    });
    const without = await run(search, { query: 'Anna' }, context(gql, { ...readOnlyPermissions(), sources: 'off' }));
    expect(without.data).not.toHaveProperty('sources');
  });

  it('gives a person with events, notes, family, citations and media', async () => {
    const { gql } = fakeGql({
      getPerson: { ...anna, email: 'a@example.org', languages: [] },
      getEvents: [{ id: 'e1', title: 'Taufe', category: 'BAPTISM', date: null, media: [] }],
      getNotes: [{ id: 'n1', text: 'Notiz', updatedAt: 'x' }],
      getPersonRelations: [
        { id: 'r1', type: 'MOTHER', role: 'MOTHER', active: true, otherPerson: greta, label: null, note: null, startDate: null, endDate: null },
        { id: 'r2', type: 'CHILD', role: 'CHILD', active: false, otherPerson: karl, label: null, note: null, startDate: null, endDate: null },
      ],
      personCitations: [{ kind: 'PERSON', fact: 'BIRTH', eventId: null, citation: { id: 'c1' } }],
      getPersonMedia: [{ id: 'm1', originalFileName: 'foto.jpg' }],
    });
    const { data } = await run(getPerson, { id: 'p1' }, context(gql));
    expect(data).toMatchObject({
      id: 'p1',
      name: 'Anna Kraft',
      email: 'a@example.org',
      events: [{ id: 'e1', title: 'Taufe', category: 'BAPTISM' }],
      notes: [{ id: 'n1' }],
      family: { parents: [{ relationId: 'r1', role: 'MOTHER' }], children: [] },
      citations: [{ kind: 'PERSON', fact: 'BIRTH' }],
      media: [{ id: 'm1' }],
    });
    expect(data).not.toHaveProperty('languages');
  });

  it('refuses an unknown person', async () => {
    const { gql } = fakeGql({ getPerson: null });
    await expect(run(getFamily, { id: 'x' }, context(gql))).rejects.toMatchObject({ reason: 'PERSON_NOT_FOUND' });
  });

  it('walks ancestors and descendants generation by generation', async () => {
    const child = person('c', 'Kind');
    const relations = [
      { personAId: 'c', personBId: 'p1', type: 'MOTHER' },
      { personAId: 'p2', personBId: 'c', type: 'CHILD' },
      { personAId: 'p1', personBId: 'p3', type: 'MOTHER' },
      { personAId: 'p1', personBId: 'p2', type: 'WIFE' },
    ];
    const { gql } = fakeGql({ getPersons: [anna, karl, greta, child], getRelations: relations });
    const up = await run(getAncestors, { id: 'c', generations: 2 }, context(gql));
    expect((up.data as { ancestors: Answer[] }).ancestors.map((p) => [p.generation, p.id])).toEqual([
      [1, 'p1'],
      [1, 'p2'],
      [2, 'p3'],
    ]);
    const down = await run(getDescendants, { id: 'p3' }, context(gql));
    expect((down.data as { descendants: Answer[] }).descendants.map((p) => [p.generation, p.id])).toEqual([
      [1, 'p1'],
      [2, 'c'],
    ]);
    await expect(run(getAncestors, { id: 'nobody' }, context(gql))).rejects.toMatchObject({ reason: 'PERSON_NOT_FOUND' });
  });

  it('looks for duplicates of a person or of a name', async () => {
    const { gql, calls } = fakeGql({ getPerson: anna, similarPersons: [karl] });
    await run(findDuplicates, { personId: 'p1' }, context(gql));
    expect(calls.find((c) => c.field === 'similarPersons')?.vars).toMatchObject({ firstName: 'Anna', excludeId: 'p1', birthDate: '14.09.1951' });
    await expect(run(findDuplicates, {}, context(gql))).rejects.toMatchObject({ reason: 'BAD_INPUT' });
  });

  it('lists the possible errors as sentences, those marked as right only on request', async () => {
    const issues = [
      { key: 'k1', code: 'ROLE_GENDER', checked: false, relationId: 'r1', role: 'MOTHER', gender: 'MALE', persons: [karl, anna] },
      { key: 'k2', code: 'LIVING_TOO_OLD', checked: true, age: 120, inexact: true, persons: [karl] },
    ];
    const { gql } = fakeGql({ plausibilityIssues: issues });

    const open = await run(listPossibleErrors, {}, context(gql));
    const all = await run(listPossibleErrors, { includeChecked: true }, context(gql));

    expect(open.data).toMatchObject({
      total: 1,
      items: [
        {
          text: 'Karl Kraft is entered as mother of Anna Kraft but is male.',
          code: 'ROLE_GENDER',
          relationId: 'r1',
          persons: [{ id: karl.id }, { id: anna.id }],
        },
      ],
    });
    expect(all.data).toMatchObject({ total: 2 });
    // A range of possible ages ("um 1900") is named as such
    expect((all.data as { items: Array<{ text: string }> }).items[1].text).toBe(
      'Karl Kraft would be at least 120 years old today; the date of death is missing.',
    );
  });
});

describe('changing persons', () => {
  it('keeps fields not given and clears fields given as ""', async () => {
    const { gql, calls } = fakeGql({ getPerson: person('p1', 'Anna'), updatePerson: person('p1', 'Anna') });
    await run(updatePerson, { id: 'p1', lastName: '', deathDate: '1990', birthPlace: 'Halle' }, context(gql));
    expect(calls.find((c) => c.field === 'updatePerson')?.vars).toEqual({
      id: 'p1',
      data: { firstName: 'Anna', lastName: null, birthPlace: 'Halle', deathDate: '1990', deathDatePrecision: 'YEAR' },
    });
  });

  it('checks dates like the form of the app before anything is saved', async () => {
    const { gql, calls } = fakeGql({ getPerson: person('p1', 'Anna', { birthDate: '14.09.1951' }), createPerson: {}, updatePerson: {}, createEvent: {} });
    await expect(run(createPerson, { firstName: 'Ida', ignoreDuplicates: true, birthDate: '31.02.1910' }, context(gql))).rejects.toMatchObject({
      reason: 'INVALID_DATE',
    });
    await expect(run(createPerson, { firstName: 'Ida', ignoreDuplicates: true, birthDate: '1950', deathDate: '1940' }, context(gql))).rejects.toMatchObject({
      reason: 'DEATH_BEFORE_BIRTH',
    });
    // The stored date of birth counts when only the date of death changes
    await expect(run(updatePerson, { id: 'p1', deathDate: '1950' }, context(gql))).rejects.toMatchObject({ reason: 'DEATH_BEFORE_BIRTH' });
    await expect(run(addEvent, { personId: 'p1', title: 'Irgendwas', category: 'OTHER', date: 'irgendwann mal' }, context(gql))).rejects.toMatchObject({
      reason: 'INVALID_DATE',
    });
    expect(calls.filter((c) => c.field !== 'getPerson')).toEqual([]);
  });

  it('creates a person when the duplicates are to be ignored', async () => {
    const { gql, calls } = fakeGql({ createPerson: person('p9', 'Ida') });
    const result = await run(createPerson, { firstName: 'Ida', ignoreDuplicates: true, birthDate: 'um 1900' }, context(gql));
    expect(result.target).toBe('Ida Kraft');
    expect(calls.map((c) => c.field)).toEqual(['createPerson']);
    expect(calls[0].vars.data).toEqual({ firstName: 'Ida', birthDate: 'um 1900', birthDatePrecision: 'APPROXIMATE' });
  });

  it('adds, changes and deletes life events', async () => {
    const { gql, calls } = fakeGql({
      createEvent: { id: 'e1' },
      getPerson: person('p1', 'Anna'),
      getEvents: [{ id: 'e1', title: 'Taufe', category: 'BAPTISM' }],
      updateEvent: { id: 'e1' },
      deleteEvent: true,
    });
    const added = await run(addEvent, { personId: 'p1', title: 'Taufe', category: 'BAPTISM', date: '1951-10-01', place: 'Leipzig' }, context(gql));
    expect(added.target).toBe('Anna Kraft');
    expect(calls[0].vars.data).toEqual({ personId: 'p1', title: 'Taufe', category: 'BAPTISM', date: '01.10.1951', datePrecision: 'EXACT', place: 'Leipzig' });

    await run(updateEvent, { personId: 'p1', eventId: 'e1', place: '' }, context(gql));
    expect(calls.find((c) => c.field === 'updateEvent')?.vars).toEqual({ id: 'e1', data: { title: 'Taufe', category: 'BAPTISM', place: null } });
    await expect(run(updateEvent, { personId: 'p1', eventId: 'e9' }, context(gql))).rejects.toMatchObject({ reason: 'EVENT_NOT_FOUND' });

    await run(deleteEvent, { personId: 'p1', eventId: 'e1' }, context(gql));
    expect(calls.some((c) => c.field === 'deleteEvent')).toBe(true);
  });

  it('adds a note', async () => {
    const { gql, calls } = fakeGql({ createNote: { id: 'n1' }, getPerson: person('p1', 'Anna') });
    await run(addNote, { personId: 'p1', text: 'Hallo' }, context(gql));
    expect(calls[0].vars).toEqual({ data: { personId: 'p1', text: 'Hallo' } });
  });

  it('creates relations in the direction of the app and keeps the persons when changing one', async () => {
    const relation = { id: 'r1', personAId: 'c', personBId: 'm', type: 'MOTHER', label: null, note: null, startDate: null, endDate: null };
    const { gql, calls } = fakeGql({
      createRelation: relation,
      getPerson: person('c', 'Kind'),
      getRelations: [relation],
      updateRelation: relation,
      deleteRelation: true,
    });
    await run(createRelation, { personId: 'c', relatedPersonId: 'm', relation: 'MOTHER', startDate: '12.06.1948' }, context(gql));
    expect(calls[0].vars).toEqual({ data: { personAId: 'c', personBId: 'm', type: 'MOTHER', startDate: '1948-06-12' }, confirmed: false });

    await run(updateRelation, { relationId: 'r1', label: 'Stiefmutter', confirmed: true }, context(gql));
    expect(calls.find((c) => c.field === 'updateRelation')?.vars).toEqual({
      id: 'r1',
      confirmed: true,
      data: { personAId: 'c', personBId: 'm', type: 'MOTHER', label: 'Stiefmutter' },
    });
    await expect(run(updateRelation, { relationId: 'r9' }, context(gql))).rejects.toMatchObject({ reason: 'RELATION_NOT_FOUND' });

    await run(moveToRecycleBin, { kind: 'relation', id: 'r1' }, context(gql));
    expect(calls.some((c) => c.field === 'deleteRelation')).toBe(true);
  });

  it('starts a parent-child relation with the exact birth of the child, like the form', async () => {
    const relation = { id: 'r1', personAId: 'c', personBId: 'm', type: 'MOTHER', label: null, note: null, startDate: null, endDate: null };
    const people: Record<string, ReturnType<typeof person>> = {
      c: person('c', 'Kind', { birthDate: '14.09.1951' }),
      m: person('m', 'Mutter', { birthDate: '1925' }),
      v: person('v', 'Vater', { birthDate: 'um 1950' }),
    };
    const { gql, calls } = fakeGql({ getPerson: (vars: Answer) => people[vars.id as string], createRelation: relation });
    const created = () => calls.filter((c) => c.field === 'createRelation').map((c) => (c.vars.data as Answer).startDate);
    await run(createRelation, { personId: 'c', relatedPersonId: 'm', relation: 'MOTHER' }, context(gql));
    await run(createRelation, { personId: 'm', relatedPersonId: 'c', relation: 'CHILD' }, context(gql));
    // Without an exact date of birth there is no start; a given start wins; partners get none
    await run(createRelation, { personId: 'm', relatedPersonId: 'v', relation: 'CHILD' }, context(gql));
    await run(createRelation, { personId: 'c', relatedPersonId: 'm', relation: 'MOTHER', startDate: '' }, context(gql));
    await run(createRelation, { personId: 'm', relatedPersonId: 'v', relation: 'HUSBAND' }, context(gql));
    expect(created()).toEqual(['1951-09-14', '1951-09-14', undefined, null, undefined]);
  });

  it('shows days of relations like the app and refuses an end before the start', async () => {
    const relation = {
      id: 'r1',
      personAId: 'a',
      personBId: 'b',
      type: 'HUSBAND',
      label: null,
      note: null,
      startDate: '1948-06-12T00:00:00.000Z',
      endDate: null,
    };
    const { gql, calls } = fakeGql({ getPerson: person('a', 'Anna'), getRelations: [relation], updateRelation: relation, createRelation: relation });
    const changed = await run(updateRelation, { relationId: 'r1', note: 'Hochzeit' }, context(gql));
    expect(changed.data).toMatchObject({ startDate: '12.06.1948', endDate: null });
    await expect(run(updateRelation, { relationId: 'r1', endDate: '01.01.1940' }, context(gql))).rejects.toMatchObject({ reason: 'INVALID_DATE' });
    await expect(
      run(createRelation, { personId: 'a', relatedPersonId: 'b', relation: 'HUSBAND', startDate: '1950-01-01', endDate: '1949-01-01' }, context(gql)),
    ).rejects.toMatchObject({ reason: 'INVALID_DATE' });
    expect(calls.filter((c) => c.field === 'updateRelation' || c.field === 'createRelation')).toHaveLength(1);
  });

  it('moves a person into the recycle bin', async () => {
    const { gql, calls } = fakeGql({ getPerson: person('p1', 'Anna'), deletePerson: true });
    const result = await run(moveToRecycleBin, { kind: 'person', id: 'p1' }, context(gql));
    expect(result.target).toBe('Anna Kraft');
    expect(calls.some((c) => c.field === 'deletePerson')).toBe(true);
  });
});

describe('sources', () => {
  const source = {
    id: 's1',
    type: 'CHURCH_BOOK',
    title: 'Taufbuch',
    author: 'Pfarramt',
    publication: null,
    abbreviation: null,
    text: 'lang',
    repositoryId: null,
    callNumber: 'K 12',
    note: null,
  };

  it('lists sources without their transcription', async () => {
    const { gql } = fakeGql({ sources: [source] });
    const { data } = await run(listSources, {}, context(gql));
    expect((data as { items: Answer[] }).items[0]).toEqual({ id: 's1', type: 'CHURCH_BOOK', title: 'Taufbuch', author: 'Pfarramt', callNumber: 'K 12' });
    const searched = fakeGql({ searchSources: [source] });
    await run(listSources, { query: 'Tauf' }, context(searched.gql));
    expect(searched.calls[0].field).toBe('searchSources');
  });

  it('refuses an unknown source', async () => {
    const { gql } = fakeGql({ source: null });
    await expect(run(getSource, { id: 's9' }, context(gql))).rejects.toMatchObject({ reason: 'SOURCE_NOT_FOUND' });
  });

  it('keeps the fields of a source that are not given', async () => {
    const { gql, calls } = fakeGql({ source, updateSource: { ...source, title: 'Neu' } });
    await run(updateSource, { id: 's1', title: 'Neu', author: '' }, context(gql));
    expect(calls.find((c) => c.field === 'updateSource')?.vars.data).toEqual({
      type: 'CHURCH_BOOK',
      title: 'Neu',
      author: '',
      publication: null,
      abbreviation: null,
      text: 'lang',
      repositoryId: null,
      callNumber: 'K 12',
      note: null,
    });
  });

  it('keeps the fields of an archive that are not given', async () => {
    const { gql, calls } = fakeGql({
      repositories: [{ id: 'a1', name: 'Archiv', address: 'Weg 1', url: null }],
      updateRepository: { id: 'a1', name: 'Archiv' },
    });
    await run(updateRepository, { id: 'a1', url: 'https://archiv.example' }, context(gql));
    expect(calls.find((c) => c.field === 'updateRepository')?.vars.data).toMatchObject({ name: 'Archiv', address: 'Weg 1', url: 'https://archiv.example' });
    await expect(run(updateRepository, { id: 'a9' }, context(gql))).rejects.toMatchObject({ reason: 'REPOSITORY_NOT_FOUND' });
  });

  it('adds a citation with targets and changes it', async () => {
    const { gql, calls } = fakeGql({
      createCitation: { id: 'c1', sourceId: 's1' },
      source,
      sources: [{ id: 's1', title: 'Taufbuch', citations: [{ id: 'c1', page: '12', date: null, datePrecision: null, text: null, quality: 3, note: null }] }],
      updateCitation: { id: 'c1' },
    });
    const added = await run(addCitation, { sourceId: 's1', page: 'S. 12', date: '1951-10-01', targets: [{ personId: 'p1' }, { eventId: 'e1' }] }, context(gql));
    expect(added.target).toBe('Taufbuch');
    expect(calls[0].vars).toEqual({
      data: { sourceId: 's1', page: 'S. 12', date: '01.10.1951', datePrecision: 'EXACT' },
      targets: [{ personId: 'p1', fact: 'GENERAL' }, { eventId: 'e1' }],
    });
    await run(updateCitation, { citationId: 'c1', quality: 2 }, context(gql));
    expect(calls.find((c) => c.field === 'updateCitation')?.vars.data).toEqual({
      sourceId: 's1',
      page: '12',
      date: null,
      datePrecision: null,
      text: null,
      quality: 2,
      note: null,
    });
    await expect(run(updateCitation, { citationId: 'c9' }, context(gql))).rejects.toMatchObject({ reason: 'CITATION_NOT_FOUND' });
  });
});

describe('family trees and recycle bin', () => {
  it('renames a family tree by its name and keeps the description', async () => {
    const { gql, calls } = fakeGql({ familyTrees: TREES, updateFamilyTree: { id: 'tree-1', name: 'Kraft-Weber' } });
    await run(renameFamilyTree, { familyTree: 'kraft', name: 'Kraft-Weber' }, context(gql));
    expect(calls.find((c) => c.field === 'updateFamilyTree')?.vars).toEqual({ id: 'tree-1', data: { name: 'Kraft-Weber', description: 'old' } });
    // Its own name in another spelling is fine
    await run(renameFamilyTree, { familyTree: 'kraft', name: 'KRAFT' }, context(gql));
  });

  it('refuses a name another family tree has – also one hidden from assistants', async () => {
    const { gql, calls } = fakeGql({ familyTrees: [...TREES, { id: 'tree-x', name: 'Geheim' }], createFamilyTree: {}, updateFamilyTree: {} });
    await expect(run(renameFamilyTree, { familyTree: 'kraft', name: ' weber ' }, context(gql))).rejects.toMatchObject({ reason: 'TREE_NAME_TAKEN' });
    await expect(run(createFamilyTree, { name: 'geheim' }, context(gql))).rejects.toMatchObject({ reason: 'TREE_NAME_TAKEN' });
    expect(calls.some((c) => c.field === 'updateFamilyTree' || c.field === 'createFamilyTree')).toBe(false);
  });

  it('lists the recycle bin without excluded family trees', async () => {
    setMcpExcludedTrees(['tree-x']);
    const { gql } = fakeGql({
      getDeletedPersons: [person('p1', 'Anna', { deletedAt: '2026-10-01' })],
      getRelations: [
        { id: 'r1', type: 'MOTHER', active: false, personAId: 'p2', personBId: 'p1', updatedAt: '2026-10-02T08:00:00.000Z' },
        { id: 'r2', active: true },
      ],
      getPersons: [person('p2', 'Karl')],
      deletedFamilyTrees: [
        { id: 'tree-x', name: 'Geheim' },
        { id: 'tree-y', name: 'Alt' },
      ],
      deletedSources: [],
      deletedRepositories: [],
    });
    const { data } = await run(listRecycleBin, {}, context(gql));
    expect(data).toMatchObject({ familyTrees: [{ id: 'tree-y' }], sources: [], archives: [] });
    // Names of both persons – also of one in the recycle bin – and the time it went there
    expect((data as { relations: unknown[] }).relations).toEqual([
      {
        id: 'r1',
        type: 'MOTHER',
        personId: 'p2',
        person: 'Karl Kraft',
        relatedPersonId: 'p1',
        relatedPerson: 'Anna Kraft',
        deletedAt: '2026-10-02T08:00:00.000Z',
      },
    ]);
  });

  it('restores and deletes for good, sources only with their permission', async () => {
    const { gql, calls } = fakeGql({ restorePerson: person('p1', 'Anna'), hardDeleteSource: true, deletedFamilyTrees: [] });
    const restored = await run(restoreFromRecycleBin, { kind: 'person', id: 'p1' }, context(gql));
    expect(restored.target).toBe('Anna Kraft');
    await expect(run(deleteForGood, { kind: 'source', id: 's1' }, context(gql))).rejects.toMatchObject({ reason: 'NOT_ALLOWED' });
    await run(deleteForGood, { kind: 'source', id: 's1' }, context(gql, { ...readOnlyPermissions(), sources: 'write', recycleBin: 'delete' }));
    expect(calls.some((c) => c.field === 'hardDeleteSource')).toBe(true);
    await expect(run(deleteForGood, { kind: 'familyTree', id: 'tree-z' }, context(gql))).rejects.toMatchObject({ reason: 'NOT_ALLOWED' });
    const trees = { ...readOnlyPermissions(), familyTrees: 'delete' as const, recycleBin: 'delete' as const };
    await expect(run(deleteForGood, { kind: 'familyTree', id: 'tree-z' }, context(gql, trees))).rejects.toMatchObject({ reason: 'TREE_NOT_FOUND' });
  });
});

describe('settings and statistics', () => {
  it('changes one size limit and keeps the other', async () => {
    const { gql, calls } = fakeGql({ setLogLevel: 'debug', sizeLimits: { importMb: 512, backupMb: null }, setSizeLimits: {}, systemInfo: {} });
    await run(setSettings, { logLevel: 'debug', backupMb: 1024 }, context(gql));
    expect(calls.find((c) => c.field === 'setLogLevel')?.vars).toEqual({ level: 'debug' });
    expect(calls.find((c) => c.field === 'setSizeLimits')?.vars).toEqual({ importMb: 512, backupMb: 1024 });
  });

  it('gives the figures of the statistics for a scope, without the filters of the page', async () => {
    const anna = person('p1', 'Anna');
    const karl = person('p2', 'Karl');
    const { gql, calls } = fakeGql({
      treeStatistics: {
        total: 3,
        surnames: [{ label: 'Kraft', count: 3, filter: 'surname:Kraft' }],
        records: [{ kind: 'longestLife', value: 80, ties: 0, possibleError: false, persons: [anna] }],
        ancestors: { person: karl, isHomePerson: true, generations: [{ generation: 1, found: 1, filter: 'ancestors:x:1', openEndsFilter: 'openEnds:x:1' }] },
      },
      sourceStatistics: { persons: 3, citedPersons: 0, citations: 0, sources: 0, topSources: [] },
    });
    const { data } = await run(getStatistics, { scope: 'SURNAME', surname: 'Kraft', bornFrom: 1900 }, context(gql));

    expect(calls.find((c) => c.field === 'treeStatistics')?.vars).toMatchObject({
      scope: { kind: 'SURNAME', surname: 'Kraft', bornFrom: 1900 },
    });
    expect(data).toEqual({
      total: 3,
      surnames: [{ label: 'Kraft', count: 3 }],
      records: [{ kind: 'longestLife', value: 80, ties: 0, possibleError: false, persons: [{ id: anna.id, name: 'Anna Kraft' }] }],
      ancestors: { person: { id: karl.id, name: 'Karl Kraft' }, isHomePerson: true, generations: [{ generation: 1, found: 1 }] },
      sources: { persons: 3, citedPersons: 0, citations: 0, sources: 0, topSources: [] },
    });
  });

  it('names no persons and no sources without permission to read them', async () => {
    const { gql } = fakeGql({
      treeStatistics: {
        total: 3,
        oldestBirth: { year: 1850, person: person('p1', 'Anna') },
        records: [{ kind: 'longestLife', value: 80, ties: 0, possibleError: false, persons: [person('p1', 'Anna')] }],
        migration: { places: [{ place: 'Leipzig', persons: 2, filter: 'place:Leipzig' }] },
        ancestors: { person: person('p2', 'Karl'), isHomePerson: true, generations: [{ generation: 1, found: 1 }] },
      },
      sourceStatistics: { persons: 3, citedPersons: 1, citations: 1, sources: 1, topSources: [{ title: 'Kirchenbuch', links: 1 }] },
    });
    const { data } = await run(getStatistics, {}, context(gql, { ...readOnlyPermissions(), persons: 'off', sources: 'off' }));

    expect(data).toEqual({
      total: 3,
      oldestBirth: { year: 1850 },
      records: [{ kind: 'longestLife', value: 80, ties: 0, possibleError: false }],
      migration: { places: [{ place: 'Leipzig', persons: 2 }] },
      ancestors: { isHomePerson: true, generations: [{ generation: 1, found: 1 }] },
      sources: { persons: 3, citedPersons: 1, citations: 1, sources: 1 },
    });
  });
});
