import { z } from 'zod';
import { RELATION_TYPES, birthDateOf } from '../../../resolvers/relationResolvers.js';
import { EVENT_CATEGORIES, GENDERS, MARITAL_STATUSES, MAX_NOTE_LENGTH } from '../../personValues.js';
import { parseFlexibleDate, type ParsedDate } from '../../flexibleDate.js';
import { checkLifespan, relationDay, shownDay, storedDate } from '../dates.js';
import { McpToolError, defineTool, id, text, type Gql } from '../tool.js';
import { PERSON_FIELDS, fullName, personSummary, type PersonRow } from './format.js';
import { loadPerson } from './persons.js';

const date = (what: string) =>
  text(`${what}, e.g. "14.09.1951", "09.1951", "1951", "um 1951", "nach 1951", "1949-1951" or "1951-09-14"; the precision follows from the form; "" clears it`);

/** The fields of a person an assistant may set; on update a missing field keeps its value, "" or null clears it */
const PERSON_INPUT = {
  firstName: z.string().min(1).max(200).optional().describe('First name(s); "(Vorname unbekannt)" if unknown'),
  lastName: text('Last name'),
  middleName: text('Middle name'),
  birthName: text('Birth name (maiden name)'),
  title: text('Title, e.g. "Dr."'),
  nickname: text('Nickname'),
  gender: z.enum(GENDERS).optional(),
  birthDate: date('Date of birth'),
  birthPlace: text('Place of birth'),
  deathDate: date('Date of death'),
  deathPlace: text('Place of death'),
  occupation: text('Occupation'),
  address: text('Postal address'),
  phone: text('Phone'),
  email: text('E-mail'),
  hobbies: text('Hobbies'),
  maritalStatus: z.enum(MARITAL_STATUSES).nullable().optional(),
  nationality: text('Nationality'),
  languages: z.array(z.string().max(100)).max(50).optional().describe('Languages the person speaks'),
};

type PersonArgs = { [K in keyof typeof PERSON_INPUT]?: z.infer<(typeof PERSON_INPUT)[K]> };

/** A date already stored; null if empty or not readable (imported data may hold any text) */
const storedValue = (value: unknown): ParsedDate | null => {
  const result = typeof value === 'string' && value.trim() ? parseFlexibleDate(value, true) : null;
  return result?.ok ? result.value : null;
};

/**
 * Input of createPerson/updatePerson: only the given fields, dates checked and in the stored form, "" as null.
 * `current`: the stored person on update – a new date of birth is checked against the stored date of death and vice versa.
 */
function personInput(args: PersonArgs, current?: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && key in PERSON_INPUT) {
      data[key] = value === '' ? null : value;
    }
  }
  const parsed: Record<'birth' | 'death', ParsedDate | null> = { birth: null, death: null };
  for (const field of ['birth', 'death'] as const) {
    const value = args[`${field}Date`];
    if (value === undefined) {
      parsed[field] = storedValue(current?.[`${field}Date`]);
      continue;
    }
    const stored = storedDate(field === 'birth' ? 'The date of birth' : 'The date of death', value);
    data[`${field}Date`] = stored.date;
    data[`${field}DatePrecision`] = stored.precision;
    parsed[field] = stored.parsed;
  }
  checkLifespan(parsed.birth, parsed.death);
  return data;
}

export const createPerson = defineTool({
  name: 'create_person',
  title: 'Create a person',
  description:
    'Creates a person. Looks for possible duplicates first: if there are any, nothing is created and they are returned – call again with ignoreDuplicates true if the person is really new.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: { ...PERSON_INPUT, firstName: z.string().min(1).max(200).describe('First name(s)'), ignoreDuplicates: z.boolean().optional() },
  run: async ({ ignoreDuplicates, ...args }, { gql }) => {
    const data = personInput(args);
    if (!ignoreDuplicates) {
      const { similarPersons } = await gql<{ similarPersons: PersonRow[] }>(
        `query ($firstName: String!, $lastName: String, $birthName: String, $birthDate: String) {
          similarPersons(firstName: $firstName, lastName: $lastName, birthName: $birthName, birthDate: $birthDate) { ${PERSON_FIELDS} }
        }`,
        { firstName: args.firstName, lastName: data.lastName ?? null, birthName: data.birthName ?? null, birthDate: data.birthDate ?? null },
      );
      if (similarPersons.length) {
        return {
          data: {
            created: false,
            possibleDuplicates: similarPersons.map(personSummary),
            hint: 'Nothing was created. If none of these is the same person, call create_person again with ignoreDuplicates true.',
          },
        };
      }
    }
    const { createPerson: person } = await gql<{ createPerson: PersonRow }>(
      `mutation ($data: PersonInput!) { createPerson(data: $data) { ${PERSON_FIELDS} } }`,
      {
        data,
      },
    );
    return { data: { created: true, person: personSummary(person) }, target: fullName(person) };
  },
});

export const updatePerson = defineTool({
  name: 'update_person',
  title: 'Change a person',
  description: 'Changes fields of a person; fields not given keep their value, "" clears a field.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: { id: id('Id of the person'), ...PERSON_INPUT },
  run: async ({ id: personId, ...args }, { gql }) => {
    const current = await loadPerson(gql, personId);
    const data = { firstName: current.firstName, ...personInput(args, current) };
    const { updatePerson: person } = await gql<{ updatePerson: PersonRow }>(
      `mutation ($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { ${PERSON_FIELDS} } }`,
      { id: personId, data },
    );
    return { data: personSummary(person), target: fullName(person) };
  },
});

/** Name of a person for the page "Activity"; null if it cannot be read (the change itself succeeded) */
const nameOf = (gql: Gql, personId: string) => loadPerson(gql, personId).then(fullName, () => null);

const EVENT_FIELDS = 'id personId title category date datePrecision place description';

const eventInput = (args: { date?: string | null; place?: string | null; description?: string | null }) => {
  const data: Record<string, unknown> = {};
  if (args.date !== undefined) {
    const stored = storedDate('The date', args.date);
    data.date = stored.date;
    data.datePrecision = stored.precision;
  }
  for (const key of ['place', 'description'] as const) {
    if (args[key] !== undefined) {
      data[key] = args[key] || null;
    }
  }
  return data;
};

const EVENT_INPUT = {
  title: z.string().min(1).max(500).describe('Title, e.g. "Baptism in St. Nicholas"'),
  category: z.enum(EVENT_CATEGORIES).describe('Kind of life event'),
  date: date('Date'),
  place: text('Place'),
  description: text('Description'),
};

export const addEvent = defineTool({
  name: 'add_event',
  title: 'Add a life event',
  description: 'Adds a life event (birth, baptism, school, wedding, occupation, move, death, other) to a person.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: { personId: id('Id of the person'), ...EVENT_INPUT },
  run: async ({ personId, title, category, ...rest }, { gql }) => {
    const { createEvent } = await gql<{ createEvent: Record<string, unknown> }>(
      `mutation ($data: EventInput!) { createEvent(data: $data) { ${EVENT_FIELDS} } }`,
      {
        data: { personId, title, category, ...eventInput(rest) },
      },
    );
    return { data: createEvent, target: await nameOf(gql, personId) };
  },
});

/** The life event of a person or EVENT_NOT_FOUND */
async function loadEvent(gql: Gql, personId: string, eventId: string) {
  const { getEvents } = await gql<{ getEvents: Array<{ id: string; title: string; category: string }> }>(
    `query ($id: ID!) { getEvents(personId: $id) { ${EVENT_FIELDS} } }`,
    { id: personId },
  );
  const event = getEvents.find((e) => e.id === eventId);
  if (!event) {
    throw new McpToolError('EVENT_NOT_FOUND', `The person ${personId} has no life event ${eventId}.`);
  }
  return event;
}

export const updateEvent = defineTool({
  name: 'update_event',
  title: 'Change a life event',
  description: 'Changes a life event of a person; fields not given keep their value, "" clears a field.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: {
    personId: id('Id of the person the event belongs to'),
    eventId: id('Id of the life event'),
    ...EVENT_INPUT,
    title: EVENT_INPUT.title.optional(),
    category: EVENT_INPUT.category.optional(),
  },
  run: async ({ personId, eventId, title, category, ...rest }, { gql }) => {
    const current = await loadEvent(gql, personId, eventId);
    const { updateEvent: event } = await gql<{ updateEvent: Record<string, unknown> }>(
      `mutation ($id: ID!, $data: UpdateEventInput!) { updateEvent(id: $id, data: $data) { ${EVENT_FIELDS} } }`,
      { id: eventId, data: { title: title ?? current.title, category: category ?? current.category, ...eventInput(rest) } },
    );
    return { data: event, target: await nameOf(gql, personId) };
  },
});

export const deleteEvent = defineTool({
  name: 'delete_event',
  title: 'Delete a life event',
  description: 'Deletes a life event of a person for good (it does not go into the recycle bin).',
  area: 'persons',
  level: 'delete',
  inTree: true,
  input: { personId: id('Id of the person the event belongs to'), eventId: id('Id of the life event') },
  run: async ({ personId, eventId }, { gql }) => {
    await loadEvent(gql, personId, eventId);
    await gql('mutation ($id: ID!) { deleteEvent(id: $id) }', { id: eventId });
    return { data: { deleted: true }, target: await nameOf(gql, personId) };
  },
});

const note = z.string().min(1).max(MAX_NOTE_LENGTH).describe('Text of the note');

export const addNote = defineTool({
  name: 'add_note',
  title: 'Add a note',
  description: 'Adds a note to a person.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: { personId: id('Id of the person'), text: note },
  run: async ({ personId, text: value }, { gql }) => {
    const { createNote } = await gql<{ createNote: Record<string, unknown> }>('mutation ($data: NoteInput!) { createNote(data: $data) { id personId text } }', {
      data: { personId, text: value },
    });
    return { data: createNote, target: await nameOf(gql, personId) };
  },
});

export const updateNote = defineTool({
  name: 'update_note',
  title: 'Change a note',
  description: 'Replaces the text of a note.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: { noteId: id('Id of the note'), text: note },
  run: async ({ noteId, text: value }, { gql }) => {
    const { updateNote: changed } = await gql<{ updateNote: { id: string; personId: string; text: string } }>(
      'mutation ($id: ID!, $data: UpdateNoteInput!) { updateNote(id: $id, data: $data) { id personId text } }',
      { id: noteId, data: { text: value } },
    );
    return { data: changed, target: await nameOf(gql, changed.personId) };
  },
});

export const deleteNote = defineTool({
  name: 'delete_note',
  title: 'Delete a note',
  description: 'Deletes a note for good (it does not go into the recycle bin).',
  area: 'persons',
  level: 'delete',
  inTree: true,
  input: { noteId: id('Id of the note') },
  run: async ({ noteId }, { gql }) => {
    await gql('mutation ($id: ID!) { deleteNote(id: $id) }', { id: noteId });
    return { data: { deleted: true } };
  },
});

const RELATION_FIELDS = 'id personAId personBId type label active note startDate endDate';

interface RelationRow {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  label: string | null;
  note: string | null;
  startDate: string | null;
  endDate: string | null;
}

const relationDetails = {
  label: text('Label, e.g. "stepmother" or "godfather"'),
  startDate: text('Start, e.g. the day of the wedding: "1948-06-12" or "12.06.1948"; "" clears it'),
  endDate: text('End, e.g. the day of the divorce; "" clears it'),
  note: text('Note on the relation'),
  confirmed: z.boolean().optional().describe('Only after the user confirmed a relation the app refused as IMPLAUSIBLE (e.g. a man as mother): saves it anyway'),
};

/** Label, note and days of a relation; `current`: the stored relation on update – the end must not lie before the start */
const relationValues = (
  args: { label?: string | null; note?: string | null; startDate?: string | null; endDate?: string | null },
  current?: Pick<RelationRow, 'startDate' | 'endDate'>,
) => {
  const data: Record<string, unknown> = {};
  if (args.label !== undefined) {
    data.label = args.label || null;
  }
  if (args.note !== undefined) {
    data.note = args.note || null;
  }
  const startDate = relationDay('The start', args.startDate);
  const endDate = relationDay('The end', args.endDate);
  if (startDate !== undefined) {
    data.startDate = startDate;
  }
  if (endDate !== undefined) {
    data.endDate = endDate;
  }
  const start = startDate === undefined ? current?.startDate?.slice(0, 10) : startDate;
  const end = endDate === undefined ? current?.endDate?.slice(0, 10) : endDate;
  if (start && end && end < start) {
    throw new McpToolError('INVALID_DATE', 'The end of the relation lies before its start.');
  }
  return data;
};

/** A relation as the assistant sees it: days as the app shows them ("12.06.1948") */
const shownRelation = (relation: RelationRow) => ({ ...relation, startDate: shownDay(relation.startDate), endDate: shownDay(relation.endDate) });

export const createRelation = defineTool({
  name: 'create_relation',
  title: 'Create a relation',
  description:
    'Creates a relation: "relatedPerson is the <relation> of person". Example: person = child, relatedPerson = mother, relation MOTHER. A parent-child relation without a start starts with the exact date of birth of the child, as in the app. The second parent of a child is derived as in the app; relations that would make a person its own ancestor are refused. A relation that looks wrong (a man as mother, a partner who is a child, a mother of 60 …) is refused as IMPLAUSIBLE with the reasons: ask the user and only then call again with confirmed true.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: {
    personId: id('Id of the person'),
    relatedPersonId: id('Id of the related person'),
    relation: z.enum(RELATION_TYPES).describe('What the related person is to the person'),
    ...relationDetails,
  },
  run: async ({ personId, relatedPersonId, relation, confirmed, ...rest }, { gql }) => {
    // Like the form of the app: a parent-child relation starts with the birth of the child (exact dates only)
    const child = relation === 'MOTHER' || relation === 'FATHER' ? personId : relation === 'CHILD' ? relatedPersonId : null;
    const born = child && rest.startDate === undefined ? birthDateOf((await loadPerson(gql, child)).birthDate) : null;
    const startDate = born ? born.toISOString().slice(0, 10) : rest.startDate;
    const { createRelation: created } = await gql<{ createRelation: RelationRow }>(
      `mutation ($data: RelationInput!, $confirmed: Boolean) { createRelation(data: $data, confirmed: $confirmed) { ${RELATION_FIELDS} } }`,
      { data: { personAId: personId, personBId: relatedPersonId, type: relation, ...relationValues({ ...rest, startDate }) }, confirmed: confirmed ?? false },
    );
    return { data: shownRelation(created), target: await nameOf(gql, personId) };
  },
});

/** A relation of the family tree (also one in the recycle bin) or RELATION_NOT_FOUND */
export async function loadRelation(gql: Gql, relationId: string) {
  const { getRelations } = await gql<{ getRelations: RelationRow[] }>(`query { getRelations(includeInactive: true) { ${RELATION_FIELDS} } }`);
  const relation = getRelations.find((r) => r.id === relationId);
  if (!relation) {
    throw new McpToolError('RELATION_NOT_FOUND', `No relation with id ${relationId} in this family tree.`);
  }
  return relation;
}

export const updateRelation = defineTool({
  name: 'update_relation',
  title: 'Change a relation',
  description: 'Changes the kind, label, dates or note of a relation; fields not given keep their value, "" clears a field.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: { relationId: id('Id of the relation'), relation: z.enum(RELATION_TYPES).optional(), ...relationDetails },
  run: async ({ relationId, relation, confirmed, ...rest }, { gql }) => {
    const current = await loadRelation(gql, relationId);
    const { updateRelation: changed } = await gql<{ updateRelation: RelationRow }>(
      `mutation ($id: ID!, $data: RelationInput!, $confirmed: Boolean) { updateRelation(id: $id, data: $data, confirmed: $confirmed) { ${RELATION_FIELDS} } }`,
      {
        id: relationId,
        confirmed: confirmed ?? false,
        data: { personAId: current.personAId, personBId: current.personBId, type: relation ?? current.type, ...relationValues(rest, current) },
      },
    );
    return { data: shownRelation(changed), target: await nameOf(gql, current.personAId) };
  },
});

export const moveToRecycleBin = defineTool({
  name: 'move_to_recycle_bin',
  title: 'Move into the recycle bin',
  description: 'Moves a person (with its relations) or a single relation into the recycle bin; the user can restore it in the app.',
  area: 'persons',
  level: 'write',
  inTree: true,
  input: { kind: z.enum(['person', 'relation']), id: id('Id of the person or relation') },
  run: async ({ kind, id: recordId }, { gql }) => {
    if (kind === 'person') {
      const target = await nameOf(gql, recordId);
      await gql('mutation ($id: ID!) { deletePerson(id: $id) }', { id: recordId });
      return { data: { movedToRecycleBin: true }, target };
    }
    const relation = await loadRelation(gql, recordId);
    await gql('mutation ($id: ID!) { deleteRelation(id: $id) }', { id: recordId });
    return { data: { movedToRecycleBin: true }, target: await nameOf(gql, relation.personAId) };
  },
});

export const PERSON_CHANGE_TOOLS = [
  createPerson,
  updatePerson,
  addEvent,
  updateEvent,
  deleteEvent,
  addNote,
  updateNote,
  deleteNote,
  createRelation,
  updateRelation,
  moveToRecycleBin,
];
