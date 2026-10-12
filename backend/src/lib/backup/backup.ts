import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { MAX_MEDIA_BYTES, TransferError } from '../transfer/format.js';
import { fileTimestamp } from '../transfer/exportData.js';
import { backupMaxUnpackedBytes, toMb } from '../transfer/limits.js';
import { appVersion } from '../systemInfo.js';
import { uploadDir } from '../files/uploads.js';

/**
 * Complete backup of all family trees (Settings → Backup): a ZIP file with manifest.json
 * (format version, time, counts, checksum), data.json (all tables unchanged, including the
 * recycle bin and import history) and the uploaded files under files/.
 * Unlike the export of a single family tree, a restore brings back exactly the saved state – with
 * the same ids. New fields are added as optional; incompatible changes increase BACKUP_VERSION.
 */
export const BACKUP_FORMAT = 'cognatio-backup';
export const BACKUP_VERSION = 1;

const text = z.string().nullable();
const date = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
const optionalDate = date.nullable();

const treeRow = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: text,
  isDeleted: z.boolean(),
  deletedAt: optionalDate,
  createdAt: date,
  updatedAt: date,
});

const personRow = z.object({
  id: z.string().min(1),
  familyTreeId: z.string().min(1),
  firstName: z.string(),
  lastName: text,
  middleName: text,
  birthName: text,
  title: text,
  nickname: text,
  birthDate: text,
  birthDatePrecision: text,
  birthPlace: text,
  gender: z.string(),
  deathDate: text,
  deathDatePrecision: text,
  deathPlace: text,
  address: text,
  phone: text,
  email: text,
  occupation: text,
  hobbies: text,
  maritalStatus: text,
  nationality: text,
  languages: z.array(z.string()),
  profilePictureId: text,
  phonetics: z.array(z.string()).default([]),
  isDeleted: z.boolean(),
  deletedAt: optionalDate,
  createdAt: date,
  updatedAt: date,
});

const relationRow = z.object({
  id: z.string().min(1),
  personAId: z.string().min(1),
  personBId: z.string().min(1),
  type: z.string(),
  label: text,
  active: z.boolean(),
  note: text,
  startDate: optionalDate,
  endDate: optionalDate,
  createdAt: date,
  updatedAt: date,
});

const eventRow = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  date: text,
  datePrecision: text,
  title: z.string(),
  category: z.string(),
  description: text,
  place: text,
  sortOrder: z.number().int().nullable(),
  createdAt: date,
  updatedAt: date,
});

const noteRow = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  text: z.string(),
  createdAt: date,
  updatedAt: date,
});

const mediaRow = z.object({
  id: z.string().min(1),
  familyTreeId: z.string().min(1),
  personId: text,
  // Only a file name – a path could lead out of the upload folder
  fileName: z
    .string()
    .min(1)
    .refine((name) => name === path.basename(name) && !name.startsWith('.'), 'not a valid file name'),
  originalFileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative().max(MAX_MEDIA_BYTES),
  type: z.string(),
  createdAt: date,
  updatedAt: date,
});

const eventMediaRow = z.object({ eventId: z.string().min(1), mediaId: z.string().min(1), createdAt: date });

const importRow = z.object({
  id: z.string().min(1),
  familyTreeId: z.string().min(1),
  importedAt: date,
  fileName: z.string(),
  fileHash: z.string(),
  kind: z.string(),
  source: text,
  exportedAt: optionalDate,
  strategy: z.string(),
  createdPersons: z.number().int(),
  updatedPersons: z.number().int(),
  removedPersons: z.number().int(),
  recognizedPersons: z.number().int().default(0),
  createdRelations: z.number().int(),
  createdEvents: z.number().int(),
  createdNotes: z.number().int(),
  createdMedia: z.number().int(),
  missingFiles: z.number().int(),
});

const dataSchema = z.object({
  familyTrees: z.array(treeRow),
  persons: z.array(personRow),
  relations: z.array(relationRow),
  events: z.array(eventRow),
  notes: z.array(noteRow),
  media: z.array(mediaRow),
  eventMedia: z.array(eventMediaRow),
  imports: z.array(importRow),
});

export type BackupData = z.output<typeof dataSchema>;

export interface BackupCounts {
  trees: number;
  deletedTrees: number;
  persons: number;
  deletedPersons: number;
  relations: number;
  events: number;
  notes: number;
  media: number;
  imports: number;
}

const manifestSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime({ offset: true }),
  appVersion: z.string(),
  /** SHA-256 of data.json – detects damaged or modified files */
  sha256: z.string(),
  counts: z.record(z.string(), z.number()),
  /** Family trees with their number of persons (without the recycle bin) for the preview */
  trees: z.array(z.object({ name: z.string(), persons: z.number(), isDeleted: z.boolean() })).default([]),
  missingFiles: z.number().int().nonnegative().default(0),
});

export type BackupManifest = z.infer<typeof manifestSchema>;

type Db = Pick<PrismaClient, 'familyTree' | 'person' | 'relation' | 'event' | 'note' | 'media' | 'eventMedia' | 'importRecord'>;

/** All tables in a fixed order (sorted by id: the same data produces the same file) */
async function readAll(db: Db) {
  const byId = { orderBy: { id: 'asc' as const } };
  const [familyTrees, persons, relations, events, notes, media, eventMedia, imports] = await Promise.all([
    db.familyTree.findMany(byId),
    db.person.findMany(byId),
    db.relation.findMany(byId),
    db.event.findMany(byId),
    db.note.findMany(byId),
    db.media.findMany(byId),
    db.eventMedia.findMany({ orderBy: [{ eventId: 'asc' }, { mediaId: 'asc' }] }),
    db.importRecord.findMany(byId),
  ]);
  return { familyTrees, persons, relations, events, notes, media, eventMedia, imports };
}

type Rows = Awaited<ReturnType<typeof readAll>> | BackupData;

export function countRows(data: Rows): BackupCounts {
  return {
    trees: data.familyTrees.filter((t) => !t.isDeleted).length,
    deletedTrees: data.familyTrees.filter((t) => t.isDeleted).length,
    persons: data.persons.filter((p) => !p.isDeleted).length,
    deletedPersons: data.persons.filter((p) => p.isDeleted).length,
    relations: data.relations.length,
    events: data.events.length,
    notes: data.notes.length,
    media: data.media.length,
    imports: data.imports.length,
  };
}

/** Current data in the database (for the comparison before a restore) */
export async function currentCounts(db: Db): Promise<BackupCounts> {
  const [trees, deletedTrees, persons, deletedPersons, relations, events, notes, media, imports] = await Promise.all([
    db.familyTree.count({ where: { isDeleted: false } }),
    db.familyTree.count({ where: { isDeleted: true } }),
    db.person.count({ where: { isDeleted: false } }),
    db.person.count({ where: { isDeleted: true } }),
    db.relation.count(),
    db.event.count(),
    db.note.count(),
    db.media.count(),
    db.importRecord.count(),
  ]);
  return { trees, deletedTrees, persons, deletedPersons, relations, events, notes, media, imports };
}

const treeSummary = (data: Rows) =>
  [...data.familyTrees]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((t) => ({
      name: t.name,
      isDeleted: t.isDeleted,
      persons: data.persons.filter((p) => p.familyTreeId === t.id && !p.isDeleted).length,
    }));

/** File name of the backup, e.g. "cognatio_backup_20260930_143005.zip" */
export const backupFileName = (now: Date, prefix = 'cognatio_backup') => `${prefix}_${fileTimestamp(now)}.zip`;

/**
 * Creates the backup of all family trees. Files missing in the upload folder are skipped and
 * counted – the records are kept so the backup matches the data.
 */
export async function createBackup(db: Db, now = new Date()) {
  const data = await readAll(db);
  const zip: Zippable = {};
  const missing: string[] = [];
  for (const m of data.media) {
    const full = path.join(uploadDir, path.basename(m.fileName));
    if (!fs.existsSync(full)) {
      missing.push(m.fileName);
      continue;
    }
    // Images/documents are usually compressed already – store only
    zip[`files/${path.basename(m.fileName)}`] = [fs.readFileSync(full), { level: 0 }];
  }
  const json = strToU8(JSON.stringify(data, null, 2));
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    appVersion: appVersion(),
    sha256: createHash('sha256').update(json).digest('hex'),
    counts: { ...countRows(data) },
    trees: treeSummary(data),
    missingFiles: missing.length,
  };
  zip['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  zip['data.json'] = json;
  return { buffer: Buffer.from(zipSync(zip)), manifest, missing };
}

export interface BackupFile {
  manifest: BackupManifest;
  data: BackupData;
  /** Content of the files, key = file name in the upload folder */
  files: Map<string, Uint8Array>;
  /** Media without a file in the backup */
  missingFiles: string[];
}

const parseJson = (bytes: Uint8Array | undefined, name: string): unknown => {
  if (!bytes) {
    throw new TransferError('BACKUP_INVALID', [`${name} is missing – not a Cognatio backup`]);
  }
  try {
    return JSON.parse(strFromU8(bytes).replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new TransferError('BACKUP_INVALID', [`${name}: ${(err as Error).message}`]);
  }
};

const issues = (error: z.ZodError, file: string) => error.issues.slice(0, 20).map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);

/**
 * Reads and checks a backup completely before anything is deleted: format and version,
 * checksum, structure of all records, duplicate ids and references between the tables.
 */
export function readBackup(buffer: Buffer): BackupFile {
  if (!(buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    throw new TransferError('BACKUP_INVALID', ['Not a ZIP file']);
  }
  let entries: Record<string, Uint8Array>;
  let unpacked = 0;
  const limit = backupMaxUnpackedBytes();
  try {
    entries = unzipSync(buffer, {
      filter: (file) => {
        unpacked += file.originalSize;
        if (unpacked > limit) {
          throw new TransferError('UNPACKED_TOO_LARGE', [`Unpacked larger than ${limit} bytes`], { limitMb: toMb(limit) });
        }
        return !file.name.endsWith('/');
      },
    });
  } catch (err) {
    if (err instanceof TransferError) {
      throw err;
    }
    throw new TransferError('BACKUP_INVALID', [(err as Error).message]);
  }

  // An export of a single family tree belongs in "Import/Export" – a hint of its own instead of a format error
  if (!entries['manifest.json'] && Object.keys(entries).some((name) => path.posix.basename(name) === 'persons.json')) {
    throw new TransferError('BACKUP_IS_EXPORT');
  }
  const rawManifest = parseJson(entries['manifest.json'], 'manifest.json') as { format?: unknown; version?: unknown };
  if (rawManifest?.format !== BACKUP_FORMAT) {
    throw new TransferError('BACKUP_INVALID', ['manifest.json: unknown format']);
  }
  if (typeof rawManifest.version === 'number' && rawManifest.version > BACKUP_VERSION) {
    throw new TransferError('BACKUP_TOO_NEW', [`Version ${rawManifest.version}, supported up to ${BACKUP_VERSION}`]);
  }
  const manifest = manifestSchema.safeParse(rawManifest);
  if (!manifest.success) {
    throw new TransferError('BACKUP_INVALID', issues(manifest.error, 'manifest.json'));
  }

  const json = entries['data.json'];
  if (json && createHash('sha256').update(json).digest('hex') !== manifest.data.sha256) {
    throw new TransferError('BACKUP_CHECKSUM', ['Checksum of data.json does not match – file damaged or modified']);
  }
  const parsed = dataSchema.safeParse(parseJson(json, 'data.json'));
  if (!parsed.success) {
    throw new TransferError('BACKUP_INVALID', issues(parsed.error, 'data.json'));
  }
  const data = parsed.data;

  const problems = integrityProblems(data);
  if (problems.length) {
    throw new TransferError('INTEGRITY', problems.slice(0, 20));
  }

  const files = new Map<string, Uint8Array>();
  for (const [name, content] of Object.entries(entries)) {
    if (name.startsWith('files/')) {
      files.set(name.slice('files/'.length), content);
    }
  }
  const missingFiles = data.media.filter((m) => !files.has(m.fileName)).map((m) => m.fileName);
  return { manifest: manifest.data, data, files, missingFiles };
}

/** Duplicate ids and references to records that do not exist */
function integrityProblems(data: BackupData): string[] {
  const problems: string[] = [];
  const ids = (table: string, rows: Array<{ id: string }>) => {
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.id)) {
        problems.push(`${table}: id ${r.id} duplicated`);
      }
      seen.add(r.id);
    }
    return seen;
  };
  const trees = ids('familyTrees', data.familyTrees);
  const persons = ids('persons', data.persons);
  const events = ids('events', data.events);
  const media = ids('media', data.media);
  ids('relations', data.relations);
  ids('notes', data.notes);
  ids('imports', data.imports);

  const expect = (ok: boolean, message: string) => ok || problems.push(message);
  for (const p of data.persons) {
    expect(trees.has(p.familyTreeId), `Person ${p.id}: family tree ${p.familyTreeId} missing`);
  }
  for (const r of data.relations) {
    expect(persons.has(r.personAId) && persons.has(r.personBId), `Relation ${r.id}: person missing`);
  }
  for (const e of data.events) {
    expect(persons.has(e.personId), `Event ${e.id}: person ${e.personId} missing`);
  }
  for (const n of data.notes) {
    expect(persons.has(n.personId), `Note ${n.id}: person ${n.personId} missing`);
  }
  for (const m of data.media) {
    expect(trees.has(m.familyTreeId), `Medium ${m.id}: family tree ${m.familyTreeId} missing`);
    expect(!m.personId || persons.has(m.personId), `Medium ${m.id}: person ${m.personId} missing`);
  }
  for (const l of data.eventMedia) {
    expect(events.has(l.eventId) && media.has(l.mediaId), `Link ${l.eventId}/${l.mediaId}: event or medium missing`);
  }
  for (const i of data.imports) {
    expect(trees.has(i.familyTreeId), `Import ${i.id}: family tree ${i.familyTreeId} missing`);
  }
  if (!data.familyTrees.some((t) => !t.isDeleted)) {
    problems.push('No family tree outside the recycle bin');
  }
  return problems;
}

/** For the preview: what the backup contains */
export const describeBackup = (backup: BackupFile) => ({
  createdAt: backup.manifest.createdAt,
  appVersion: backup.manifest.appVersion,
  version: backup.manifest.version,
  counts: countRows(backup.data),
  trees: treeSummary(backup.data),
  missingFiles: backup.missingFiles.length,
});

/** Write large tables in chunks – PostgreSQL allows at most 65535 parameters per statement */
const CHUNK = 1000;
async function insertAll<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await insert(rows.slice(i, i + CHUNK));
  }
}

type RestoreDb = Pick<PrismaClient, '$transaction' | 'media'>;

/**
 * Replaces all data with the backup – all or nothing: the files are first written to a
 * staging folder, deleting and inserting happens in one transaction. Only then are the
 * files taken over and the ones no longer used removed. If anything fails, the old state remains.
 */
export async function restoreBackup(db: RestoreDb, backup: BackupFile, now = new Date()) {
  const { data } = backup;
  // Dot folders are not served under /uploads
  const staging = path.join(uploadDir, `.restore-${fileTimestamp(now)}-${process.pid}`);
  fs.mkdirSync(staging, { recursive: true });
  try {
    for (const [name, content] of backup.files) {
      if (data.media.some((m) => m.fileName === name)) {
        fs.writeFileSync(path.join(staging, path.basename(name)), content);
      }
    }
    const previousFiles = (await db.media.findMany({ select: { fileName: true } })).map((m) => m.fileName);

    await db.$transaction(
      async (tx) => {
        await tx.eventMedia.deleteMany();
        await tx.relation.deleteMany();
        await tx.note.deleteMany();
        await tx.event.deleteMany();
        await tx.media.deleteMany();
        await tx.person.deleteMany();
        await tx.importRecord.deleteMany();
        await tx.familyTree.deleteMany();

        await insertAll(data.familyTrees, (rows) => tx.familyTree.createMany({ data: rows }));
        await insertAll(data.persons, (rows) => tx.person.createMany({ data: rows }));
        await insertAll(data.media, (rows) => tx.media.createMany({ data: rows }));
        await insertAll(data.events, (rows) => tx.event.createMany({ data: rows }));
        await insertAll(data.notes, (rows) => tx.note.createMany({ data: rows }));
        await insertAll(data.relations, (rows) => tx.relation.createMany({ data: rows }));
        await insertAll(data.eventMedia, (rows) => tx.eventMedia.createMany({ data: rows }));
        await insertAll(data.imports, (rows) => tx.importRecord.createMany({ data: rows }));
      },
      { maxWait: 10_000, timeout: 600_000 },
    );

    // Take over the files (files with the same name are replaced), then remove the ones no longer used
    for (const name of fs.readdirSync(staging)) {
      fs.renameSync(path.join(staging, name), path.join(uploadDir, name));
    }
    const kept = new Set(data.media.map((m) => m.fileName));
    for (const name of previousFiles) {
      if (kept.has(name)) {
        continue;
      }
      const full = path.join(uploadDir, path.basename(name));
      if (fs.existsSync(full)) {
        fs.unlinkSync(full);
      }
    }
    return countRows(data);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

const SAFETY_PREFIX = 'cognatio_before_restore';
/** Backups taken before a restore that are kept: each one holds all data and media */
export const KEEP_SAFETY_BACKUPS = 3;

/** Removes the oldest backups taken before a restore, the newest `keep` stay; returns the removed file names */
export function pruneSafetyBackups(dir: string, keep = KEEP_SAFETY_BACKUPS): string[] {
  const old = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${SAFETY_PREFIX}_`) && name.endsWith('.zip'))
    .sort()
    .reverse()
    .slice(keep);
  old.forEach((name) => fs.rmSync(path.join(dir, name), { force: true }));
  return old;
}

/** Stores a backup in the folder of the automatic backups (before a restore); only the newest few are kept */
export async function writeSafetyBackup(db: Db, dir: string, now = new Date()) {
  const { buffer } = await createBackup(db, now);
  fs.mkdirSync(dir, { recursive: true });
  const fileName = backupFileName(now, SAFETY_PREFIX);
  fs.writeFileSync(path.join(dir, fileName), buffer);
  pruneSafetyBackups(dir);
  return fileName;
}
