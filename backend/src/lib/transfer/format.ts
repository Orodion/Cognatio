import { z } from 'zod';
import { DATE_PRECISIONS, EVENT_CATEGORIES, GENDERS, MARITAL_STATUSES, MAX_NOTE_LENGTH } from '../personValues.js';
import { CITATION_FACTS, SOURCE_TYPES } from '../sourceValues.js';

/**
 * Exchange format for export/import (persons.json in the ZIP file).
 * New fields are added as optional; incompatible changes increase FORMAT_VERSION.
 */
export const FORMAT_NAME = 'cognatio-export';
/**
 * Newest version the app reads and writes. 2 brings archives, sources and citations; a file without them is still
 * written as version 1 (FORMAT_VERSION_PLAIN), so the app 1.0.x reads it – it would drop the sources of a version 2
 * file silently and refuses it instead.
 */
export const FORMAT_VERSION = 2;
export const FORMAT_VERSION_PLAIN = 1;

const text = z.string().nullable().optional();

// Values the app knows; an import does not fail on others but takes the neutral value (like the GEDCOM import)
const known = <T extends string>(values: readonly T[], value: string) => (values as readonly string[]).includes(value);
const gender = z
  .string()
  .default('UNKNOWN')
  .transform((value) => (known(GENDERS, value) ? value : 'UNKNOWN'));
const precision = z
  .string()
  .nullable()
  .transform((value) => (value && !known(DATE_PRECISIONS, value) ? null : value))
  .optional();
const maritalStatus = z
  .string()
  .nullable()
  .transform((value) => (value && !known(MARITAL_STATUSES, value) ? null : value))
  .optional();
const category = z.string().transform((value) => (known(EVENT_CATEGORIES, value) ? value : 'OTHER'));
const sourceType = z
  .string()
  .default('OTHER')
  .transform((value) => (known(SOURCE_TYPES, value) ? value : 'OTHER'));
const fact = z
  .string()
  .default('GENERAL')
  .transform((value) => (known(CITATION_FACTS, value) ? value : 'GENERAL'));
/** Citations that support a record (ids of `citations` in the file) */
const citationIds = z.array(z.string().min(1)).default([]);

/** Largest size of a medium in the files (there is no limit per file; a JSON number is exact up to here, 8 PiB) */
export const MAX_MEDIA_BYTES = Number.MAX_SAFE_INTEGER;
const timestamp = z.iso.datetime({ offset: true });

export const mediaSchema = z.object({
  id: z.string().min(1),
  /** Path of the file inside the ZIP file, e.g. "media/Muster_Max_1a2b3c4d/muster_max_photo_1.jpg" */
  path: z.string().min(1),
  originalFileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative().max(MAX_MEDIA_BYTES),
  type: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const eventSchema = z.object({
  id: z.string().min(1),
  date: text,
  datePrecision: precision,
  title: z.string(),
  category,
  description: text,
  place: text,
  sortOrder: z.number().int().nullable().optional(),
  /** Linked media – ids of media of any person in the file (e.g. a group photo) */
  mediaIds: z.array(z.string().min(1)).default([]),
  citationIds,
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const noteSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

/**
 * Parts of a text of at most `max` characters, cut at a line break or a blank where possible. A note of another
 * program or of an older version may be longer than a note of the app; it becomes several notes instead of one the
 * form cannot save.
 */
export function splitLongText(text: string, max = MAX_NOTE_LENGTH): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    const atLine = window.lastIndexOf('\n');
    const atBlank = window.lastIndexOf(' ');
    const cut = atLine > max / 2 ? atLine : atBlank > max / 2 ? atBlank : max;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return [...parts, rest];
}

/** Notes longer than the limit become several notes; the first keeps the id, the others get the id with "~2", "~3" … */
const notes = z
  .array(noteSchema)
  .default([])
  .transform((list) =>
    list.flatMap((note) => {
      if (note.text.trim().length <= MAX_NOTE_LENGTH) {
        return [note];
      }
      return splitLongText(note.text).map((text, i) => ({ ...note, id: i ? `${note.id}~${i + 1}` : note.id, text }));
    }),
  );

export const personSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: text,
  middleName: text,
  birthName: text,
  title: text,
  nickname: text,
  birthDate: text,
  birthDatePrecision: precision,
  birthPlace: text,
  gender,
  deathDate: text,
  deathDatePrecision: precision,
  deathPlace: text,
  address: text,
  phone: text,
  email: text,
  occupation: text,
  hobbies: text,
  maritalStatus,
  nationality: text,
  languages: z.array(z.string()).default([]),
  profilePictureId: text,
  isDeleted: z.boolean().default(false),
  deletedAt: timestamp.nullable().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
  events: z.array(eventSchema).default([]),
  notes,
  media: z.array(mediaSchema).default([]),
  /** Citations of the person: GENERAL (the person as a whole), NAME, BIRTH, DEATH */
  citations: z.array(z.object({ citationId: z.string().min(1), fact })).default([]),
});

export const relationSchema = z.object({
  id: z.string().min(1),
  personAId: z.string().min(1),
  personBId: z.string().min(1),
  type: z.string(),
  label: text,
  active: z.boolean().default(true),
  note: text,
  startDate: timestamp.nullable().optional(),
  endDate: timestamp.nullable().optional(),
  citationIds,
  createdAt: timestamp,
  updatedAt: timestamp,
});

// The library (one for all family trees): an export contains the parts its persons use
export const repositorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: text,
  url: text,
  email: text,
  phone: text,
  note: text,
  isDeleted: z.boolean().default(false),
  deletedAt: timestamp.nullable().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  type: sourceType,
  title: z.string().min(1),
  author: text,
  publication: text,
  abbreviation: text,
  text,
  repositoryId: text,
  callNumber: text,
  note: text,
  /** Scans of the whole source – ids of `libraryMedia` or of media of persons in the file */
  mediaIds: z.array(z.string().min(1)).default([]),
  isDeleted: z.boolean().default(false),
  deletedAt: timestamp.nullable().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const citationSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  page: text,
  date: text,
  datePrecision: precision,
  text,
  quality: z.number().int().min(0).max(3).nullable().optional(),
  note: text,
  /** Scans of the page or entry */
  mediaIds: z.array(z.string().min(1)).default([]),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const transferSchema = z.object({
  format: z.literal(FORMAT_NAME),
  version: z.number().int().min(FORMAT_VERSION_PLAIN).max(FORMAT_VERSION),
  /** Time of the export (ISO 8601) – identifies the export file */
  exportedAt: timestamp,
  /** Origin, e.g. "Cognatio" or "GEDCOM 5.5.1" */
  source: z.string().optional(),
  persons: z.array(personSchema),
  relations: z.array(relationSchema).default([]),
  // Since version 2
  repositories: z.array(repositorySchema).default([]),
  sources: z.array(sourceSchema).default([]),
  citations: z.array(citationSchema).default([]),
  /** Scans of sources and citations (no person) */
  libraryMedia: z.array(mediaSchema).default([]),
});

export type TransferData = z.infer<typeof transferSchema>;
export type TransferRepository = z.infer<typeof repositorySchema>;
export type TransferSource = z.infer<typeof sourceSchema>;
export type TransferCitation = z.infer<typeof citationSchema>;
export type TransferPerson = z.infer<typeof personSchema>;
export type TransferRelation = z.infer<typeof relationSchema>;
export type TransferEvent = z.infer<typeof eventSchema>;
export type TransferNote = z.infer<typeof noteSchema>;
export type TransferMedia = z.infer<typeof mediaSchema>;

/** Error while reading an import file – `reason` is translated in the frontend, `details` are only logged/shown. */
export class TransferError extends Error {
  constructor(
    public reason: string,
    public details: string[] = [],
    /** Numbers for the message in the UI, e.g. `limitMb` */
    public params: Record<string, number> = {},
  ) {
    super(reason);
  }
}

/**
 * Checks the schema and data integrity (unique ids, references to existing persons/events/media).
 * Throws a TransferError with all problems found.
 */
export function validateTransfer(raw: unknown): TransferData {
  const header = z.object({ format: z.string(), version: z.number() }).safeParse(raw);
  if (header.success && header.data.format === FORMAT_NAME && header.data.version > FORMAT_VERSION) {
    throw new TransferError('UNSUPPORTED_VERSION', [`Version ${header.data.version}, supported: ${FORMAT_VERSION}`]);
  }
  const parsed = transferSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TransferError(
      'INVALID_SCHEMA',
      parsed.error.issues.slice(0, 20).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  const data = parsed.data;
  const problems: string[] = [];
  sortEventLinks(data);
  const unique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        problems.push(`${kind} ${id} occurs more than once`);
      }
      seen.add(id);
    }
    return seen;
  };

  const personIds = unique(
    'Person',
    data.persons.map((p) => p.id),
  );
  unique(
    'Relation',
    data.relations.map((r) => r.id),
  );
  unique(
    'Event',
    data.persons.flatMap((p) => p.events.map((e) => e.id)),
  );
  unique(
    'Note',
    data.persons.flatMap((p) => p.notes.map((n) => n.id)),
  );
  const allMediaIds = unique('Medium', [...data.persons.flatMap((p) => p.media.map((m) => m.id)), ...data.libraryMedia.map((m) => m.id)]);
  const repositoryIds = unique(
    'Archive',
    data.repositories.map((r) => r.id),
  );
  const sourceIds = unique(
    'Source',
    data.sources.map((s) => s.id),
  );
  const allCitationIds = unique(
    'Citation',
    data.citations.map((c) => c.id),
  );
  const checkCitations = (owner: string, ids: string[]) => {
    for (const id of ids) {
      if (!allCitationIds.has(id)) {
        problems.push(`${owner}: citation ${id} missing`);
      }
    }
  };
  const checkMedia = (owner: string, ids: string[]) => {
    for (const id of ids) {
      if (!allMediaIds.has(id)) {
        problems.push(`${owner}: medium ${id} missing`);
      }
    }
  };
  for (const s of data.sources) {
    if (s.repositoryId && !repositoryIds.has(s.repositoryId)) {
      problems.push(`Source ${s.id}: archive ${s.repositoryId} missing`);
    }
    checkMedia(`Source ${s.id}`, s.mediaIds);
  }
  for (const c of data.citations) {
    if (!sourceIds.has(c.sourceId)) {
      problems.push(`Citation ${c.id}: source ${c.sourceId} missing`);
    }
    checkMedia(`Citation ${c.id}`, c.mediaIds);
  }

  for (const p of data.persons) {
    const mediaIds = new Set(p.media.map((m) => m.id));
    checkCitations(
      `Person ${p.id}`,
      p.citations.map((c) => c.citationId),
    );
    for (const e of p.events) {
      checkCitations(`Event ${e.id}`, e.citationIds);
      for (const id of e.mediaIds) {
        if (!allMediaIds.has(id)) {
          problems.push(`Event ${e.id}: medium ${id} missing`);
        }
      }
    }
    if (p.profilePictureId && !mediaIds.has(p.profilePictureId)) {
      problems.push(`Person ${p.id}: profile picture ${p.profilePictureId} missing`);
    }
  }
  for (const r of data.relations) {
    for (const id of [r.personAId, r.personBId]) {
      if (!personIds.has(id)) {
        problems.push(`Relation ${r.id}: person ${id} missing`);
      }
    }
    if (r.personAId === r.personBId) {
      problems.push(`Relation ${r.id}: person linked with itself`);
    }
    checkCitations(`Relation ${r.id}`, r.citationIds);
  }
  if (problems.length) {
    throw new TransferError('INTEGRITY', problems.slice(0, 20));
  }
  return data;
}

/**
 * The links of an event are kept sorted and without duplicates so identical links count as equal when
 * compared with the existing data.
 */
function sortEventLinks(data: TransferData) {
  for (const p of data.persons) {
    p.citations = sortedPersonCitations(p.citations);
    for (const e of p.events) {
      e.mediaIds = sortedIds(e.mediaIds);
      e.citationIds = sortedIds(e.citationIds);
    }
  }
  for (const r of data.relations) {
    r.citationIds = sortedIds(r.citationIds);
  }
  for (const s of data.sources) {
    s.mediaIds = sortedIds(s.mediaIds);
  }
  for (const c of data.citations) {
    c.mediaIds = sortedIds(c.mediaIds);
  }
}

/** Citations of a person sorted and without duplicates (citation, then fact) */
export const sortedPersonCitations = (citations: Array<{ citationId: string; fact: string }>) =>
  [...new Map(citations.map((c) => [`${c.citationId}|${c.fact}`, c])).values()].sort(
    (a, b) => a.citationId.localeCompare(b.citationId) || a.fact.localeCompare(b.fact),
  );

/** Version to write: 2 only if the file contains sources, otherwise 1 so older versions of the app can read it */
export const formatVersionOf = (data: Pick<TransferData, 'sources' | 'citations' | 'repositories'>) =>
  data.sources.length || data.citations.length || data.repositories.length ? FORMAT_VERSION : FORMAT_VERSION_PLAIN;

export const sortedIds = (ids: string[]) => [...new Set(ids)].sort();

/**
 * Placeholder when a file contains no first name (the first name is required). It counts as unknown:
 * no first name in the export, no recognition by name.
 */
export const UNKNOWN_GIVEN_NAME = '(Vorname unbekannt)';
export const isUnknownGivenName = (firstName: string | null | undefined) => ['', UNKNOWN_GIVEN_NAME].includes((firstName ?? '').trim());
