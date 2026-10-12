import { z } from 'zod';
import { DATE_PRECISIONS, EVENT_CATEGORIES, GENDERS } from '../personValues.js';

/**
 * Exchange format for export/import (persons.json in the ZIP file).
 * New fields are added as optional; incompatible changes increase FORMAT_VERSION.
 */
export const FORMAT_NAME = 'cognatio-export';
export const FORMAT_VERSION = 1;

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
const category = z.string().transform((value) => (known(EVENT_CATEGORIES, value) ? value : 'OTHER'));

/** Largest file the database can record for a medium (`sizeBytes` is a 32-bit number) */
export const MAX_MEDIA_BYTES = 2 ** 31 - 1;
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
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const noteSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

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
  maritalStatus: text,
  nationality: text,
  languages: z.array(z.string()).default([]),
  profilePictureId: text,
  isDeleted: z.boolean().default(false),
  deletedAt: timestamp.nullable().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
  events: z.array(eventSchema).default([]),
  notes: z.array(noteSchema).default([]),
  media: z.array(mediaSchema).default([]),
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
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const transferSchema = z.object({
  format: z.literal(FORMAT_NAME),
  version: z.literal(FORMAT_VERSION),
  /** Time of the export (ISO 8601) – identifies the export file */
  exportedAt: timestamp,
  /** Origin, e.g. "Cognatio" or "GEDCOM 5.5.1" */
  source: z.string().optional(),
  persons: z.array(personSchema),
  relations: z.array(relationSchema).default([]),
});

export type TransferData = z.infer<typeof transferSchema>;
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
  const allMediaIds = unique(
    'Medium',
    data.persons.flatMap((p) => p.media.map((m) => m.id)),
  );

  for (const p of data.persons) {
    const mediaIds = new Set(p.media.map((m) => m.id));
    for (const e of p.events) {
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
    for (const e of p.events) {
      e.mediaIds = sortedIds(e.mediaIds);
    }
  }
}

export const sortedIds = (ids: string[]) => [...new Set(ids)].sort();

/**
 * Placeholder when a file contains no first name (the first name is required). It counts as unknown:
 * no first name in the export, no recognition by name.
 */
export const UNKNOWN_GIVEN_NAME = '(Vorname unbekannt)';
export const isUnknownGivenName = (firstName: string | null | undefined) => ['', UNKNOWN_GIVEN_NAME].includes((firstName ?? '').trim());
