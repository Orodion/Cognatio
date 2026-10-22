import { isUnknownGivenName, sortedIds, type TransferData, type TransferPerson } from './format.js';
import { toGedcomDate } from './gedcomDate.js';
import { standardTitleKey } from './languageTexts.js';

/** How many persons of a GEDCOM file were recognised in the existing data */
export interface Recognition {
  /** via the included identifier (UID from an export of the app) */
  byId: number;
  /** via the same name and the same birth year */
  byName: number;
}

/** Fields that may be missing in a GEDCOM file without deleting the existing value */
const FILLABLE = [
  'lastName',
  'middleName',
  'birthName',
  'title',
  'nickname',
  'birthDate',
  'birthDatePrecision',
  'birthPlace',
  'deathDate',
  'deathDatePrecision',
  'deathPlace',
  'address',
  'phone',
  'email',
  'occupation',
  'hobbies',
  'maritalStatus',
  'nationality',
  'profilePictureId',
] as const satisfies ReadonlyArray<keyof TransferPerson>;

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();
const year = (date: string | null | undefined) => (date ?? '').match(/(?:^|\D)(\d{4})(?!\d)/)?.[1] ?? null;
const fullDate = (date: string | null | undefined) => (date ?? '').match(/^\d{2}\.\d{2}\.\d{4}$/)?.[0] ?? null;

/**
 * Keys for recognition without an identifier: first given name, family name and birth year – one each
 * for last name and birth name (the file may only know one of them). Without a birth year there is
 * deliberately no match – the same name alone would be too uncertain.
 */
function matchKeys(p: TransferPerson) {
  const given = normalize(p.firstName).split(' ')[0];
  const born = year(p.birthDate);
  if (isUnknownGivenName(p.firstName) || !given || !born) {
    return [];
  }
  const families = new Set([normalize(p.lastName), normalize(p.birthName)].filter(Boolean));
  return [...families].map((family) => `${given}|${family}|${born}`);
}

/** Only unique keys count – two persons with the same name and birth year stay separate */
function uniqueIndex(persons: TransferPerson[]) {
  const index = new Map<string, TransferPerson | null>();
  for (const p of persons) {
    for (const key of matchKeys(p)) {
      index.set(key, index.has(key) ? null : p);
    }
  }
  return index;
}

/**
 * Titles and dates the import wrote in another language count as the same: "Beerdigung" and "Burial", "um 1880" and
 * "about 1880" (a repeated import may run in another language of the interface)
 */
const titleKey = (title: string) => standardTitleKey(title) ?? normalize(title);
const dateKey = (date: string | null | undefined) => {
  const gedcom = toGedcomDate(date);
  return gedcom && 'date' in gedcom ? gedcom.date : normalize(date);
};
const eventKey = (e: TransferPerson['events'][number]) => [e.category, titleKey(e.title), dateKey(e.date)].join('|');
const mediaKey = (m: TransferPerson['media'][number]) => `${m.originalFileName}|${m.sizeBytes}`;

/**
 * Matches GEDCOM persons with the existing data so a repeated import creates nothing twice:
 * 1. via the id (UID from an export of the app),
 * 2. otherwise via the same name and birth year if that is unique on both sides
 *    (if complete birth dates differ, it counts as another person).
 * For recognised persons, details missing in the file keep their existing value
 * (GEDCOM does not know all fields of the app), and events, notes and media with the same content
 * are matched to the existing ones instead of being created again.
 */
export function reconcileGedcom(imported: TransferData, existing: TransferData): { data: TransferData; recognized: Recognition } {
  const existingById = new Map(existing.persons.map((p) => [p.id, p]));
  const recognized: Recognition = { byId: 0, byName: 0 };
  const claimed = new Set(imported.persons.filter((p) => existingById.has(p.id)).map((p) => p.id));

  const existingIndex = uniqueIndex(existing.persons.filter((p) => !p.isDeleted && !claimed.has(p.id)));
  const importedIndex = uniqueIndex(imported.persons.filter((p) => !existingById.has(p.id)));
  const idMap = new Map<string, string>();

  for (const p of imported.persons) {
    if (existingById.has(p.id)) {
      recognized.byId++;
      continue;
    }
    // All unique keys must point to the same existing person
    const matches = new Set(
      matchKeys(p)
        .filter((key) => importedIndex.get(key) === p)
        .map((key) => existingIndex.get(key))
        .filter((candidate): candidate is TransferPerson => !!candidate),
    );
    const [match] = matches;
    if (matches.size !== 1 || claimed.has(match.id)) {
      continue;
    }
    const a = fullDate(p.birthDate);
    const b = fullDate(match.birthDate);
    if (a && b && a !== b) {
      continue;
    }
    idMap.set(p.id, match.id);
    claimed.add(match.id);
    recognized.byName++;
  }

  // Reused media ids apply to all links – also those at events of other persons
  const mediaIdMap = new Map<string, string>();
  const merged = imported.persons.map((p) => {
    const ex = existingById.get(idMap.get(p.id) ?? p.id);
    if (!ex) {
      return p;
    }
    const { person, mediaIds } = mergeInto({ ...p, id: ex.id }, ex);
    for (const [from, to] of mediaIds) {
      mediaIdMap.set(from, to);
    }
    return person;
  });
  const persons = merged.map((p) => ({
    ...p,
    events: p.events.map((e) => ({ ...e, mediaIds: sortedIds(e.mediaIds.map((id) => mediaIdMap.get(id) ?? id)) })),
  }));
  const relations = imported.relations.map((r) => ({
    ...r,
    personAId: idMap.get(r.personAId) ?? r.personAId,
    personBId: idMap.get(r.personBId) ?? r.personBId,
  }));
  return { data: { ...imported, persons, relations }, recognized };
}

/** Take over missing details from the existing data, match identical sub-records to the existing ones */
function mergeInto(p: TransferPerson, ex: TransferPerson): { person: TransferPerson; mediaIds: Map<string, string> } {
  const person: TransferPerson = { ...p };
  for (const field of FILLABLE) {
    if ((person[field] ?? '') === '' && (ex[field] ?? '') !== '') {
      (person as Record<string, unknown>)[field] = ex[field];
    }
  }
  // The same date in the words of another language keeps the existing wording
  for (const field of ['birthDate', 'deathDate'] as const) {
    if (person[field] && ex[field] && person[field] !== ex[field] && dateKey(person[field]) === dateKey(ex[field])) {
      person[field] = ex[field];
    }
  }
  if (person.gender === 'UNKNOWN') {
    person.gender = ex.gender;
  }
  if (!person.languages.length) {
    person.languages = ex.languages;
  }

  // Sub-records with the same content take over their id and timestamps (each at most once)
  const reuse = <T extends { id: string; createdAt: string; updatedAt: string }>(
    records: T[],
    existingRecords: T[],
    key: (r: T) => string,
    keep: (r: T, match: T) => Partial<T> = () => ({}),
  ) => {
    const ids = new Map<string, string>();
    const known = new Set(existingRecords.map((r) => r.id));
    const available = existingRecords.filter((r) => !records.some((own) => own.id === r.id));
    const result = records.map((r) => {
      if (known.has(r.id)) {
        return r;
      }
      const index = available.findIndex((candidate) => key(candidate) === key(r));
      if (index < 0) {
        return r;
      }
      const [match] = available.splice(index, 1);
      ids.set(r.id, match.id);
      return { ...r, ...keep(r, match), id: match.id, createdAt: match.createdAt, updatedAt: match.updatedAt };
    });
    return { result, ids };
  };
  // A matched event keeps its title and date as they are (they only differ in the language)
  const events = reuse(person.events, ex.events, eventKey, (_, match) => ({ title: match.title, date: match.date }));
  const notes = reuse(person.notes, ex.notes, (n) => normalize(n.text));
  const media = reuse(person.media, ex.media, mediaKey);
  person.events = events.result;
  person.notes = notes.result;
  person.media = media.result;
  if (person.profilePictureId) {
    person.profilePictureId = media.ids.get(person.profilePictureId) ?? person.profilePictureId;
  }
  return { person, mediaIds: media.ids };
}
