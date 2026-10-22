import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { MAX_MEDIA_BYTES, TransferError } from '../transfer/format.js';
import { fileTimestamp } from '../transfer/exportData.js';
import { ancestorCycles } from '../transfer/cycles.js';
import { backupMaxUnpackedBytes } from '../transfer/limits.js';
import { looksLikeZip, openArchive, type ArchiveFiles } from '../files/archive.js';
import { assertFreeSpace, sameDrive } from '../files/freeSpace.js';
import type { JobControl } from '../transfer/jobs.js';
import { writeZip, writeZipFile, type ZipItem } from '../files/zipWriter.js';
import { appVersion } from '../systemInfo.js';
import { uploadDir, uploadedFilePath } from '../files/uploads.js';

/**
 * Complete backup of all family trees (Settings → Backup): a ZIP file with manifest.json
 * (format version, time, counts, checksum), data.json (all tables unchanged, including the library of sources, the
 * recycle bin and import history) and the uploaded files under files/.
 * Unlike the export of a single family tree, a restore brings back exactly the saved state – with
 * the same ids. New fields are added as optional; incompatible changes increase BACKUP_VERSION.
 */
export const BACKUP_FORMAT = 'cognatio-backup';
// 2: with archives, sources, citations and their links (1.1.0); a backup of version 1 is restored without them
export const BACKUP_VERSION = 2;

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
  // Possible errors marked as right (missing in backups of 1.0.0)
  checkedIssues: z.array(z.string()).default([]),
  // Home person (missing in backups before 1.1.0)
  homePersonId: z.string().nullable().default(null),
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
  // Scans of the library have no family tree
  familyTreeId: z.string().min(1).nullable(),
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

const repositoryRow = z.object({
  id: z.string().min(1),
  name: z.string(),
  address: text,
  url: text,
  email: text,
  phone: text,
  note: text,
  isDeleted: z.boolean(),
  deletedAt: optionalDate,
  createdAt: date,
  updatedAt: date,
});

const sourceRow = z.object({
  id: z.string().min(1),
  type: z.string(),
  title: z.string(),
  author: text,
  publication: text,
  abbreviation: text,
  text,
  repositoryId: text,
  callNumber: text,
  note: text,
  isDeleted: z.boolean(),
  deletedAt: optionalDate,
  createdAt: date,
  updatedAt: date,
});

const citationRow = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  page: text,
  date: text,
  datePrecision: text,
  text,
  quality: z.number().int().nullable(),
  note: text,
  createdAt: date,
  updatedAt: date,
});

const sourceMediaRow = z.object({ sourceId: z.string().min(1), mediaId: z.string().min(1), createdAt: date });
const citationMediaRow = z.object({ citationId: z.string().min(1), mediaId: z.string().min(1), createdAt: date });
const personCitationRow = z.object({ personId: z.string().min(1), citationId: z.string().min(1), fact: z.string(), createdAt: date });
const eventCitationRow = z.object({ eventId: z.string().min(1), citationId: z.string().min(1), createdAt: date });
const relationCitationRow = z.object({ relationId: z.string().min(1), citationId: z.string().min(1), createdAt: date });

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
  // Since version 2
  repositories: z.array(repositoryRow).default([]),
  sources: z.array(sourceRow).default([]),
  citations: z.array(citationRow).default([]),
  sourceMedia: z.array(sourceMediaRow).default([]),
  citationMedia: z.array(citationMediaRow).default([]),
  personCitations: z.array(personCitationRow).default([]),
  eventCitations: z.array(eventCitationRow).default([]),
  relationCitations: z.array(relationCitationRow).default([]),
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
  /** Sources without the recycle bin, and their citations */
  sources: number;
  citations: number;
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

type Db = Pick<
  PrismaClient,
  | 'familyTree'
  | 'person'
  | 'relation'
  | 'event'
  | 'note'
  | 'media'
  | 'eventMedia'
  | 'importRecord'
  | 'repository'
  | 'source'
  | 'citation'
  | 'sourceMedia'
  | 'citationMedia'
  | 'personCitation'
  | 'eventCitation'
  | 'relationCitation'
>;

/** All tables in a fixed order (sorted by id: the same data produces the same file) */
async function readAll(db: Db) {
  const byId = { orderBy: { id: 'asc' as const } };
  const [
    familyTrees,
    persons,
    relations,
    events,
    notes,
    media,
    eventMedia,
    imports,
    repositories,
    sources,
    citations,
    sourceMedia,
    citationMedia,
    personCitations,
    eventCitations,
    relationCitations,
  ] = await Promise.all([
    db.familyTree.findMany(byId),
    db.person.findMany(byId),
    db.relation.findMany(byId),
    db.event.findMany(byId),
    db.note.findMany(byId),
    db.media.findMany(byId).then((rows) => rows.map((m) => ({ ...m, sizeBytes: Number(m.sizeBytes) }))),
    db.eventMedia.findMany({ orderBy: [{ eventId: 'asc' }, { mediaId: 'asc' }] }),
    db.importRecord.findMany(byId),
    db.repository.findMany(byId),
    db.source.findMany(byId),
    db.citation.findMany(byId),
    db.sourceMedia.findMany({ orderBy: [{ sourceId: 'asc' }, { mediaId: 'asc' }] }),
    db.citationMedia.findMany({ orderBy: [{ citationId: 'asc' }, { mediaId: 'asc' }] }),
    db.personCitation.findMany({ orderBy: [{ personId: 'asc' }, { citationId: 'asc' }, { fact: 'asc' }] }),
    db.eventCitation.findMany({ orderBy: [{ eventId: 'asc' }, { citationId: 'asc' }] }),
    db.relationCitation.findMany({ orderBy: [{ relationId: 'asc' }, { citationId: 'asc' }] }),
  ]);
  return {
    familyTrees,
    persons,
    relations,
    events,
    notes,
    media,
    eventMedia,
    imports,
    repositories,
    sources,
    citations,
    sourceMedia,
    citationMedia,
    personCitations,
    eventCitations,
    relationCitations,
  };
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
    sources: data.sources.filter((s) => !s.isDeleted).length,
    citations: data.citations.length,
  };
}

/** Current data in the database (for the comparison before a restore) */
export async function currentCounts(db: Db): Promise<BackupCounts> {
  const [trees, deletedTrees, persons, deletedPersons, relations, events, notes, media, imports, sources, citations] = await Promise.all([
    db.familyTree.count({ where: { isDeleted: false } }),
    db.familyTree.count({ where: { isDeleted: true } }),
    db.person.count({ where: { isDeleted: false } }),
    db.person.count({ where: { isDeleted: true } }),
    db.relation.count(),
    db.event.count(),
    db.note.count(),
    db.media.count(),
    db.importRecord.count(),
    db.source.count({ where: { isDeleted: false } }),
    db.citation.count(),
  ]);
  return { trees, deletedTrees, persons, deletedPersons, relations, events, notes, media, imports, sources, citations };
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
 * Creates the backup of all family trees, written piece by piece (the media are read from disk while the archive is
 * sent or saved). Files missing in the upload folder are skipped and counted – the records are kept so the backup
 * matches the data.
 */
export async function createBackup(db: Db, now = new Date()) {
  const data = await readAll(db);
  const items: ZipItem[] = [];
  const missing: string[] = [];
  for (const m of data.media) {
    const file = uploadedFilePath(m.fileName, uploadDir);
    if (!file) {
      missing.push(m.fileName);
      continue;
    }
    items.push({ name: `files/${path.basename(m.fileName)}`, file });
  }
  const json = Buffer.from(JSON.stringify(data, null, 2));
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
  // manifest.json and data.json first, the media after them
  items.unshift({ name: 'manifest.json', buffer: Buffer.from(JSON.stringify(manifest, null, 2)) }, { name: 'data.json', buffer: json });
  return { zip: writeZip(items, now), manifest, missing };
}

export interface BackupFile {
  manifest: BackupManifest;
  data: BackupData;
  /** The files, key = file name in the upload folder; read from the backup only while restoring */
  files: ArchiveFiles;
  /** Media without a file in the backup */
  missingFiles: string[];
  /** Closes the backup file */
  close: () => void;
}

async function readJson(files: ArchiveFiles, name: string): Promise<{ bytes: Buffer; value: unknown }> {
  if (!files.has(name)) {
    throw new TransferError('BACKUP_INVALID', [`${name} is missing – not a Cognatio backup`]);
  }
  const bytes = await files.read(name);
  try {
    return { bytes, value: JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')) };
  } catch (err) {
    throw new TransferError('BACKUP_INVALID', [`${name}: ${(err as Error).message}`]);
  }
}

const issues = (error: z.ZodError, file: string) => error.issues.slice(0, 20).map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);

/**
 * Reads and checks a backup file on disk before anything is deleted: format and version, checksum, structure of all
 * records, duplicate ids and references between the tables. The records are read into memory, the media only listed.
 */
export async function readBackup(filePath: string): Promise<BackupFile> {
  if (!looksLikeZip(filePath)) {
    throw new TransferError('BACKUP_INVALID', ['Not a ZIP file']);
  }
  const archive = await openArchive(filePath, 'BACKUP_INVALID', backupMaxUnpackedBytes());
  try {
    return { ...(await checkBackup(archive.files)), close: archive.close };
  } catch (err) {
    archive.close();
    throw err;
  }
}

async function checkBackup(entries: ArchiveFiles): Promise<Omit<BackupFile, 'close'>> {
  // An export of a single family tree belongs in "Import/Export" – a hint of its own instead of a format error
  if (!entries.has('manifest.json') && entries.names().some((name) => path.posix.basename(name) === 'persons.json')) {
    throw new TransferError('BACKUP_IS_EXPORT');
  }
  const rawManifest = (await readJson(entries, 'manifest.json')).value as { format?: unknown; version?: unknown };
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

  const json = await readJson(entries, 'data.json');
  if (createHash('sha256').update(json.bytes).digest('hex') !== manifest.data.sha256) {
    throw new TransferError('BACKUP_CHECKSUM', ['Checksum of data.json does not match – file damaged or modified']);
  }
  const parsed = dataSchema.safeParse(json.value);
  if (!parsed.success) {
    throw new TransferError('BACKUP_INVALID', issues(parsed.error, 'data.json'));
  }
  const data = parsed.data;

  const problems = integrityProblems(data);
  if (problems.length) {
    throw new TransferError('INTEGRITY', problems.slice(0, 20));
  }

  const files = entries.view(
    entries
      .names()
      .filter((name) => name.startsWith('files/'))
      .map((name) => [name.slice('files/'.length), name]),
  );
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
  const relations = ids('relations', data.relations);
  const repositories = ids('repositories', data.repositories);
  const sources = ids('sources', data.sources);
  const citations = ids('citations', data.citations);
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
    expect(m.familyTreeId === null || trees.has(m.familyTreeId), `Medium ${m.id}: family tree ${m.familyTreeId} missing`);
    expect(!m.personId || persons.has(m.personId), `Medium ${m.id}: person ${m.personId} missing`);
  }
  for (const l of data.eventMedia) {
    expect(events.has(l.eventId) && media.has(l.mediaId), `Link ${l.eventId}/${l.mediaId}: event or medium missing`);
  }
  for (const s of data.sources) {
    expect(!s.repositoryId || repositories.has(s.repositoryId), `Source ${s.id}: archive ${s.repositoryId} missing`);
  }
  for (const c of data.citations) {
    expect(sources.has(c.sourceId), `Citation ${c.id}: source ${c.sourceId} missing`);
  }
  for (const l of data.sourceMedia) {
    expect(sources.has(l.sourceId) && media.has(l.mediaId), `Link ${l.sourceId}/${l.mediaId}: source or medium missing`);
  }
  for (const l of data.citationMedia) {
    expect(citations.has(l.citationId) && media.has(l.mediaId), `Link ${l.citationId}/${l.mediaId}: citation or medium missing`);
  }
  for (const l of data.personCitations) {
    expect(persons.has(l.personId) && citations.has(l.citationId), `Link ${l.personId}/${l.citationId}: person or citation missing`);
  }
  for (const l of data.eventCitations) {
    expect(events.has(l.eventId) && citations.has(l.citationId), `Link ${l.eventId}/${l.citationId}: event or citation missing`);
  }
  for (const l of data.relationCitations) {
    expect(relations.has(l.relationId) && citations.has(l.citationId), `Link ${l.relationId}/${l.citationId}: relation or citation missing`);
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
  cycleTrees: cycleTrees(backup.data),
});

/** Names of the family trees in which persons are their own ancestors – restored unchanged, only warned about */
function cycleTrees(data: BackupData): string[] {
  const treeOf = new Map(data.persons.map((p) => [p.id, p.familyTreeId]));
  const treeIds = new Set(ancestorCycles(data.relations).map((ids) => treeOf.get(ids[0])));
  return data.familyTrees.filter((t) => treeIds.has(t.id)).map((t) => t.name);
}

/** Write large tables in chunks – PostgreSQL allows at most 65535 parameters per statement */
const CHUNK = 1000;
async function insertAll<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await insert(rows.slice(i, i + CHUNK));
  }
}

type RestoreDb = Pick<PrismaClient, '$transaction' | 'media'>;

/**
 * Replaces all data with the backup – all or nothing: the files are first copied from the backup into a staging
 * folder (piece by piece, after checking the free space), deleting and inserting happens in one transaction. Only
 * then are the files taken over and the ones no longer used removed. If anything fails or the user cancels before
 * the database step, the old state remains.
 */
export async function restoreBackup(db: RestoreDb, backup: BackupFile, now = new Date(), job?: JobControl) {
  const { data } = backup;
  const used = [...new Set(data.media.map((m) => m.fileName))].filter((name) => backup.files.has(name));
  const bytes = restoreBytes(backup);
  fs.mkdirSync(uploadDir, { recursive: true });
  await assertFreeSpace(uploadDir, bytes);
  // Dot folders are not served under /uploads
  const staging = path.join(uploadDir, `.restore-${fileTimestamp(now)}-${process.pid}`);
  fs.mkdirSync(staging, { recursive: true });
  try {
    job?.phase('media', bytes);
    for (const name of used) {
      job?.checkpoint();
      await backup.files.copyTo(name, path.join(staging, path.basename(name)), job?.advance);
    }
    job?.checkpoint(true);
    job?.phase('database');
    const previousFiles = (await db.media.findMany({ select: { fileName: true } })).map((m) => m.fileName);

    await db.$transaction(
      async (tx) => {
        await tx.eventMedia.deleteMany();
        await tx.sourceMedia.deleteMany();
        await tx.citationMedia.deleteMany();
        await tx.personCitation.deleteMany();
        await tx.eventCitation.deleteMany();
        await tx.relationCitation.deleteMany();
        await tx.citation.deleteMany();
        await tx.source.deleteMany();
        await tx.repository.deleteMany();
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
        await insertAll(data.repositories, (rows) => tx.repository.createMany({ data: rows }));
        await insertAll(data.sources, (rows) => tx.source.createMany({ data: rows }));
        await insertAll(data.citations, (rows) => tx.citation.createMany({ data: rows }));
        await insertAll(data.sourceMedia, (rows) => tx.sourceMedia.createMany({ data: rows }));
        await insertAll(data.citationMedia, (rows) => tx.citationMedia.createMany({ data: rows }));
        await insertAll(data.personCitations, (rows) => tx.personCitation.createMany({ data: rows }));
        await insertAll(data.eventCitations, (rows) => tx.eventCitation.createMany({ data: rows }));
        await insertAll(data.relationCitations, (rows) => tx.relationCitation.createMany({ data: rows }));
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

/** Bytes a restore of `backup` copies into the upload folder (the media that the backup contains) */
export const restoreBytes = (backup: BackupFile) =>
  backup.files.totalSize([...new Set(backup.data.media.map((m) => m.fileName))].filter((name) => backup.files.has(name)));

/**
 * Stores a complete backup in the folder of the automatic backups (before a restore), written piece by piece after
 * checking the free space; only the newest few are kept. `alsoNeeded`: bytes the restore writes into the upload folder
 * afterwards – on the same drive they must fit as well, so a lack of space shows before the long backup. Cancelling
 * stops the backup (CANCELLED).
 */
export async function writeSafetyBackup(db: Db, dir: string, now = new Date(), job?: JobControl, alsoNeeded = 0) {
  const { zip } = await createBackup(db, now);
  try {
    const size = await zip.size;
    fs.mkdirSync(dir, { recursive: true });
    await assertFreeSpace(dir, size + (sameDrive(dir, uploadDir) ? alsoNeeded : 0));
    job?.phase('safetyBackup', size);
    const fileName = backupFileName(now, SAFETY_PREFIX);
    await writeZipFile(zip, path.join(dir, fileName), (bytes) => {
      job?.advance(bytes);
      return job?.cancelled();
    });
    pruneSafetyBackups(dir);
    return fileName;
  } finally {
    // After an error the files that were being read are closed
    zip.stream.destroy();
  }
}
