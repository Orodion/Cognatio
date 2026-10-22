import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { collect, fileWith, removeTestDir, testDir } from '../../../test/archives.js';

const tmpDir = testDir('backup');
const work = testDir('backup-work');
jest.mock('../../files/uploads.js', () => ({ ...jest.requireActual('../../files/uploads.js'), uploadDir: tmpDir }));

import { BACKUP_VERSION, createBackup, describeBackup, readBackup, restoreBackup, writeSafetyBackup } from '../backup.js';
import type { TransferError } from '../../transfer/format.js';

afterAll(() => {
  removeTestDir(tmpDir);
  removeTestDir(work);
});

const d = (s: string) => new Date(s);
const stamps = { createdAt: d('2026-01-01T00:00:00.000Z'), updatedAt: d('2026-01-02T00:00:00.000Z') };

/** Data as returned by Prisma: two family trees, one of them in the recycle bin */
function rows() {
  return {
    familyTrees: [
      { id: 't1', name: 'Mustermann', description: null, isDeleted: false, deletedAt: null, ...stamps },
      { id: 't2', name: 'Alt', description: 'weg', isDeleted: true, deletedAt: d('2026-03-01T00:00:00.000Z'), ...stamps },
    ],
    persons: [
      person('p1', 't1', { profilePictureId: 'm1' }),
      person('p2', 't1', { isDeleted: true, deletedAt: d('2026-02-01T00:00:00.000Z') }),
      person('p3', 't2'),
    ],
    relations: [
      { id: 'r1', personAId: 'p1', personBId: 'p2', type: 'PARTNER', label: null, active: true, note: null, startDate: null, endDate: null, ...stamps },
    ],
    events: [
      {
        id: 'e1',
        personId: 'p1',
        date: '1950',
        datePrecision: 'YEAR',
        title: 'Geburt',
        category: 'BIRTH',
        description: null,
        place: null,
        sortOrder: null,
        ...stamps,
      },
    ],
    notes: [{ id: 'n1', personId: 'p1', text: 'Notiz', ...stamps }],
    media: [
      {
        id: 'm1',
        familyTreeId: 't1',
        personId: 'p1',
        fileName: 'a.jpg',
        originalFileName: 'Foto.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
        type: 'PROFILE_PICTURE',
        ...stamps,
      },
      {
        id: 'm2',
        familyTreeId: 't1',
        personId: null,
        fileName: 'fehlt.pdf',
        originalFileName: 'Urkunde.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 9,
        type: 'DOCUMENT',
        ...stamps,
      },
    ],
    eventMedia: [{ eventId: 'e1', mediaId: 'm1', createdAt: stamps.createdAt }],
    imports: [
      {
        id: 'i1',
        familyTreeId: 't1',
        importedAt: stamps.createdAt,
        fileName: 'x.ged',
        fileHash: 'abc',
        kind: 'GEDCOM',
        source: null,
        exportedAt: null,
        strategy: 'MERGE_NEWER',
        createdPersons: 1,
        updatedPersons: 0,
        removedPersons: 0,
        recognizedPersons: 0,
        createdRelations: 0,
        createdEvents: 0,
        createdNotes: 0,
        createdMedia: 0,
        missingFiles: 0,
      },
    ],
  };
}

function person(id: string, familyTreeId: string, extra: Record<string, unknown> = {}) {
  const empty = Object.fromEntries(
    [
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
      'deletedAt',
    ].map((k) => [k, null]),
  );
  return { id, familyTreeId, firstName: `V-${id}`, ...empty, gender: 'UNKNOWN', languages: [], phonetics: ['123'], isDeleted: false, ...stamps, ...extra };
}

/** A source with archive and citation that supports the birth of p1, with a scan of the library */
function library() {
  return {
    repositories: [
      { id: 'rep1', name: 'Standesamt', address: null, url: null, email: null, phone: null, note: null, isDeleted: false, deletedAt: null, ...stamps },
    ],
    sources: [
      {
        id: 's1',
        type: 'CIVIL_REGISTER',
        title: 'Geburtsregister',
        author: null,
        publication: null,
        abbreviation: null,
        text: null,
        repositoryId: 'rep1' as string | null,
        callNumber: null,
        note: null,
        isDeleted: false,
        deletedAt: null,
        ...stamps,
      },
    ],
    citations: [{ id: 'c1', sourceId: 's1', page: 'Nr. 7', date: null, datePrecision: null, text: null, quality: 3, note: null, ...stamps }],
    sourceMedia: [] as Array<{ sourceId: string; mediaId: string; createdAt: Date }>,
    citationMedia: [{ citationId: 'c1', mediaId: 'scan', createdAt: stamps.createdAt }],
    personCitations: [{ personId: 'p1', citationId: 'c1', fact: 'BIRTH', createdAt: stamps.createdAt }],
    eventCitations: [] as Array<{ eventId: string; citationId: string; createdAt: Date }>,
    relationCitations: [] as Array<{ relationId: string; citationId: string; createdAt: Date }>,
  };
}

/** Database stub: reads the rows, records deletes and inserts inside one transaction */
function fakeDb(data = rows(), options: { failInsert?: boolean } = {}) {
  const calls: string[] = [];
  const inserted: Record<string, unknown[]> = {};
  const table = (name: string) => ({
    findMany: jest.fn(async () => (data as Record<string, unknown[]>)[name] ?? []),
    count: jest.fn(async () => 0),
    deleteMany: jest.fn(async () => {
      calls.push(`delete ${name}`);
      return { count: 0 };
    }),
    createMany: jest.fn(async ({ data: chunk }: { data: unknown[] }) => {
      if (options.failInsert && name === 'relations') {
        throw new Error('Insert failed');
      }
      calls.push(`insert ${name}`);
      (inserted[name] ??= []).push(...chunk);
      return { count: chunk.length };
    }),
  });
  const db = {
    familyTree: table('familyTrees'),
    person: table('persons'),
    relation: table('relations'),
    event: table('events'),
    note: table('notes'),
    media: table('media'),
    eventMedia: table('eventMedia'),
    importRecord: table('imports'),
    repository: table('repositories'),
    source: table('sources'),
    citation: table('citations'),
    sourceMedia: table('sourceMedia'),
    citationMedia: table('citationMedia'),
    personCitation: table('personCitations'),
    eventCitation: table('eventCitations'),
    relationCitation: table('relationCitations'),
  };
  const $transaction = jest.fn(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db));
  return { db: { ...db, $transaction } as never, calls, inserted };
}

const reason = async (fn: () => unknown) => {
  try {
    await fn();
  } catch (err) {
    return (err as TransferError).reason;
  }
  return 'kein Fehler';
};

/** Assemble a backup from individual parts (for damaged or foreign files) */
function zipWith(manifest: unknown, data?: unknown, extra: Record<string, Uint8Array> = {}) {
  const json = data === undefined ? undefined : strToU8(JSON.stringify(data));
  const withSum = json && typeof manifest === 'object' ? { ...manifest, sha256: createHash('sha256').update(json).digest('hex') } : manifest;
  return Buffer.from(zipSync({ 'manifest.json': strToU8(JSON.stringify(withSum)), ...(json ? { 'data.json': json } : {}), ...extra }));
}

/** The backup file as it would be downloaded */
const created = async (db: never, now?: Date) => collect((await createBackup(db, now)).zip);

/** Reads a backup from its content, as uploaded (closed: the records are read, the media only listed) */
async function read(buffer: Uint8Array) {
  const backup = await readBackup(fileWith(work, buffer));
  backup.close();
  return backup;
}

/** Reads a backup that stays open for restoring */
const open = async (buffer: Uint8Array) => readBackup(fileWith(work, buffer));

beforeEach(() => {
  for (const name of fs.readdirSync(tmpDir)) {
    fs.rmSync(path.join(tmpDir, name), { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(tmpDir, 'a.jpg'), 'img');
});

describe('createBackup', () => {
  it('writes manifest, all tables and the uploaded files', async () => {
    const { zip, manifest, missing } = await createBackup(fakeDb().db, d('2026-09-30T10:00:00.000Z'));
    const size = await zip.size;
    const buffer = await collect(zip);
    expect(buffer.length).toBe(size);
    const entries = unzipSync(buffer);
    expect(Object.keys(entries).sort()).toEqual(['data.json', 'files/a.jpg', 'manifest.json']);
    expect(strFromU8(entries['files/a.jpg'])).toBe('img');
    expect(missing).toEqual(['fehlt.pdf']);
    expect(manifest).toMatchObject({
      format: 'cognatio-backup',
      version: BACKUP_VERSION,
      createdAt: '2026-09-30T10:00:00.000Z',
      missingFiles: 1,
      counts: { trees: 1, deletedTrees: 1, persons: 2, deletedPersons: 1, relations: 1, media: 2, imports: 1 },
      trees: [
        { name: 'Mustermann', persons: 1, isDeleted: false },
        { name: 'Alt', persons: 1, isDeleted: true },
      ],
    });
    expect(manifest.sha256).toBe(createHash('sha256').update(entries['data.json']).digest('hex'));
  });
});

describe('readBackup', () => {
  it('rejects a backup that is too large once unpacked', async () => {
    process.env.BACKUP_MAX_UNPACKED_MB = '1';
    try {
      const big = zipWith({ format: 'cognatio-backup', version: BACKUP_VERSION }, undefined, { 'files/big.bin': new Uint8Array(2 * 1024 * 1024) });
      expect(await reason(() => read(big))).toBe('UNPACKED_TOO_LARGE');
    } finally {
      delete process.env.BACKUP_MAX_UNPACKED_MB;
    }
  });

  it('reads its own backup back with dates restored', async () => {
    const buffer = await created(fakeDb().db);
    const backup = await read(buffer);
    expect(backup.data.persons).toHaveLength(3);
    expect(backup.data.persons[0].createdAt).toEqual(stamps.createdAt);
    expect(backup.data.familyTrees[1].deletedAt).toEqual(d('2026-03-01T00:00:00.000Z'));
    expect(backup.files.has('a.jpg')).toBe(true);
    expect(backup.missingFiles).toEqual(['fehlt.pdf']);
  });

  it('rejects files that are no backup', async () => {
    expect(await reason(() => read(Buffer.from('hallo')))).toBe('BACKUP_INVALID');
    expect(await reason(() => read(Buffer.from('PK kaputt')))).toBe('BACKUP_INVALID');
    expect(await reason(() => read(Buffer.from(zipSync({ 'x.txt': strToU8('x') }))))).toBe('BACKUP_INVALID');
    expect(await reason(() => read(zipWith({ format: 'anders', version: 1 })))).toBe('BACKUP_INVALID');
  });

  it('points to Import/Export for an export of a single family tree', async () => {
    const zip = Buffer.from(zipSync({ 'persons.json': strToU8('{}') }));
    expect(await reason(() => read(zip))).toBe('BACKUP_IS_EXPORT');
  });

  it('rejects backups of a newer version', async () => {
    expect(await reason(() => read(zipWith({ format: 'cognatio-backup', version: BACKUP_VERSION + 1 })))).toBe('BACKUP_TOO_NEW');
  });

  it('detects a modified data.json by its checksum', async () => {
    const buffer = await created(fakeDb().db);
    const entries = unzipSync(buffer);
    entries['data.json'] = strToU8(strFromU8(entries['data.json']).replace('Mustermann', 'Anders'));
    expect(await reason(() => read(Buffer.from(zipSync(entries))))).toBe('BACKUP_CHECKSUM');
  });

  it('reports broken references and duplicate ids', async () => {
    const buffer = await created(fakeDb().db);
    const entries = unzipSync(buffer);
    const manifest = JSON.parse(strFromU8(entries['manifest.json']));
    const data = JSON.parse(strFromU8(entries['data.json']));
    data.relations[0].personBId = 'unbekannt';
    data.notes.push(data.notes[0]);
    try {
      await read(zipWith(manifest, data));
      throw new Error('kein Fehler');
    } catch (err) {
      expect((err as TransferError).reason).toBe('INTEGRITY');
      expect((err as TransferError).details).toEqual(['notes: id n1 duplicated', 'Relation r1: person missing']);
    }
  });

  it('restores a backup of version 1 (before sources) with an empty library', async () => {
    const buffer = await created(fakeDb().db);
    const entries = unzipSync(buffer);
    const manifest = { ...JSON.parse(strFromU8(entries['manifest.json'])), version: 1 };
    const { repositories, sources, citations, sourceMedia, citationMedia, personCitations, eventCitations, relationCitations, ...old } = JSON.parse(
      strFromU8(entries['data.json']),
    );
    expect(
      [repositories, sources, citations, sourceMedia, citationMedia, personCitations, eventCitations, relationCitations].every((t) => Array.isArray(t)),
    ).toBe(true);
    const backup = await read(zipWith(manifest, old));
    expect(backup.data.sources).toEqual([]);
    expect(backup.data.personCitations).toEqual([]);
    expect(describeBackup(backup).counts).toMatchObject({ persons: 2, deletedPersons: 1, sources: 0, citations: 0 });
  });

  it('checks the references of the library: archive, source, citation, scans and linked facts', async () => {
    const data = { ...rows(), ...library() };
    data.media.push({ ...data.media[0], id: 'scan', familyTreeId: null, personId: null, fileName: 'scan.jpg' } as never);
    data.sources[0].repositoryId = 'missing-archive';
    data.citations.push({ ...data.citations[0], id: 'c2', sourceId: 'missing-source' });
    data.personCitations.push({ personId: 'p1', citationId: 'missing-citation', fact: 'BIRTH', createdAt: stamps.createdAt });
    data.citationMedia.push({ citationId: 'c1', mediaId: 'missing-scan', createdAt: stamps.createdAt });
    const manifest = JSON.parse(strFromU8(unzipSync(await created(fakeDb().db))['manifest.json']));
    let details: string[] = [];
    try {
      await read(zipWith(manifest, data));
    } catch (err) {
      details = (err as TransferError).details;
    }
    expect(details).toEqual([
      'Source s1: archive missing-archive missing',
      'Citation c2: source missing-source missing',
      'Link c1/missing-scan: citation or medium missing',
      'Link p1/missing-citation: person or citation missing',
    ]);
  });

  it('keeps a scan of the library without family tree and its links', async () => {
    const data = { ...rows(), ...library() };
    data.media.push({ ...data.media[0], id: 'scan', familyTreeId: null, personId: null, fileName: 'scan.jpg' } as never);
    const backup = await read(await created(fakeDb(data).db));
    expect(backup.data.media.find((m) => m.id === 'scan')).toMatchObject({ familyTreeId: null, personId: null });
    expect(backup.data.citationMedia).toEqual([{ citationId: 'c1', mediaId: 'scan', createdAt: stamps.createdAt }]);
    expect(describeBackup(backup).counts).toMatchObject({ sources: 1, citations: 1 });
  });

  it('requires a family tree outside the recycle bin', async () => {
    const data = rows();
    data.familyTrees[0].isDeleted = true;
    const buffer = await created(fakeDb(data).db);
    expect(await reason(() => read(buffer))).toBe('INTEGRITY');
  });

  it('rejects file names that would leave the upload folder', async () => {
    const data = rows();
    data.media[0].fileName = '../../etc/passwd';
    const buffer = await created(fakeDb(data).db);
    expect(await reason(() => read(buffer))).toBe('BACKUP_INVALID');
  });
});

describe('describeBackup', () => {
  it('names the family trees in which a person is their own ancestor', async () => {
    const data = rows();
    const childOf = (id: string, a: string, b: string) => ({ ...data.relations[0], id, personAId: a, personBId: b, type: 'CHILD' });
    data.relations = [...data.relations, childOf('r2', 'p1', 'p2'), childOf('r3', 'p2', 'p1')];
    expect(describeBackup(await read(await created(fakeDb(data).db))).cycleTrees).toEqual(['Mustermann']);
  });

  it('lists none for consistent data', async () => {
    expect(describeBackup(await read(await created(fakeDb().db))).cycleTrees).toEqual([]);
  });
});

describe('restoreBackup', () => {
  it('replaces everything in one transaction and swaps the files afterwards', async () => {
    const backup = await open(await created(fakeDb().db));
    // Current data: another file that is no longer needed after the restore
    fs.writeFileSync(path.join(tmpDir, 'alt.png'), 'alt');
    fs.writeFileSync(path.join(tmpDir, 'a.jpg'), 'veraltet');
    fs.writeFileSync(path.join(tmpDir, 'fremd.txt'), 'nicht von der App');
    const current = rows();
    current.media = [{ ...current.media[0], fileName: 'alt.png' }];
    const { db, calls, inserted } = fakeDb(current);

    const counts = await restoreBackup(db, backup);
    backup.close();

    expect(counts).toMatchObject({ trees: 1, deletedTrees: 1, persons: 2, deletedPersons: 1 });
    expect(calls.slice(0, 16).every((c) => c.startsWith('delete'))).toBe(true);
    expect(calls.slice(16)).toEqual([
      'insert familyTrees',
      'insert persons',
      'insert media',
      'insert events',
      'insert notes',
      'insert relations',
      'insert eventMedia',
      'insert imports',
    ]);
    expect(inserted.persons).toHaveLength(3);
    expect(inserted.persons[0]).toMatchObject({ id: 'p1', profilePictureId: 'm1', phonetics: ['123'], createdAt: stamps.createdAt });
    expect(fs.readFileSync(path.join(tmpDir, 'a.jpg'), 'utf8')).toBe('img');
    expect(fs.existsSync(path.join(tmpDir, 'alt.png'))).toBe(false);
    // Only files of the previous data are removed
    expect(fs.existsSync(path.join(tmpDir, 'fremd.txt'))).toBe(true);
    expect(fs.readdirSync(tmpDir).filter((n) => n.startsWith('.'))).toEqual([]);
  });

  it('leaves the files untouched when the transaction fails', async () => {
    const backup = await open(await created(fakeDb().db));
    fs.writeFileSync(path.join(tmpDir, 'a.jpg'), 'aktuell');
    const current = rows();
    const { db } = fakeDb(current, { failInsert: true });

    await expect(restoreBackup(db, backup)).rejects.toThrow('Insert failed');
    backup.close();
    expect(fs.readFileSync(path.join(tmpDir, 'a.jpg'), 'utf8')).toBe('aktuell');
    expect(fs.readdirSync(tmpDir).filter((n) => n.startsWith('.'))).toEqual([]);
  });

  it('writes large tables in chunks', async () => {
    const data = rows();
    data.notes = Array.from({ length: 2500 }, (_, i) => ({ id: `n${i}`, personId: 'p1', text: 'x', ...stamps }));
    const backup = await open(await created(fakeDb(data).db));
    const { db } = fakeDb();
    await restoreBackup(db, backup);
    backup.close();
    expect((db as unknown as { note: { createMany: jest.Mock } }).note.createMany).toHaveBeenCalledTimes(3);
  });
});

describe('writeSafetyBackup', () => {
  it('stores the current state in the backup folder', async () => {
    const dir = path.join(tmpDir, 'backups');
    const name = await writeSafetyBackup(fakeDb().db, dir, new Date(2026, 8, 30, 14, 30, 5));
    expect(name).toBe('cognatio_before_restore_20260930_143005.zip');
    expect((await read(fs.readFileSync(path.join(dir, name)))).data.persons).toHaveLength(3);
    expect(fs.readdirSync(dir).filter((n) => n.endsWith('.part'))).toEqual([]);
  });

  it('keeps only the newest backups taken before a restore', async () => {
    const dir = path.join(tmpDir, 'backups-pruned');
    fs.mkdirSync(dir, { recursive: true });
    // Other files of the folder are not touched
    fs.writeFileSync(path.join(dir, 'cognatio-db-20260101-000000-daily.dump'), 'x');
    fs.writeFileSync(path.join(dir, 'cognatio_backup_20260101_000000.zip'), 'x');
    for (const day of [1, 2, 3, 4]) {
      await writeSafetyBackup(fakeDb().db, dir, new Date(2026, 8, day, 12, 0, 0));
    }
    expect(fs.readdirSync(dir).sort()).toEqual([
      'cognatio-db-20260101-000000-daily.dump',
      'cognatio_backup_20260101_000000.zip',
      'cognatio_before_restore_20260902_120000.zip',
      'cognatio_before_restore_20260903_120000.zip',
      'cognatio_before_restore_20260904_120000.zip',
    ]);
  });
});
