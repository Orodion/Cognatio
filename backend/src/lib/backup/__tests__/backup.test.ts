import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-backup-'));
jest.mock('../../files/uploads.js', () => ({ uploadDir: tmpDir }));

import { BACKUP_VERSION, createBackup, readBackup, restoreBackup, writeSafetyBackup } from '../backup.js';
import type { TransferError } from '../../transfer/format.js';

afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

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

/** Database stub: reads the rows, records deletes and inserts inside one transaction */
function fakeDb(data = rows(), options: { failInsert?: boolean } = {}) {
  const calls: string[] = [];
  const inserted: Record<string, unknown[]> = {};
  const table = (name: keyof ReturnType<typeof rows>) => ({
    findMany: jest.fn(async () => data[name]),
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
  };
  const $transaction = jest.fn(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db));
  return { db: { ...db, $transaction } as never, calls, inserted };
}

const reason = (fn: () => unknown) => {
  try {
    fn();
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

beforeEach(() => {
  for (const name of fs.readdirSync(tmpDir)) {
    fs.rmSync(path.join(tmpDir, name), { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(tmpDir, 'a.jpg'), 'img');
});

describe('createBackup', () => {
  it('writes manifest, all tables and the uploaded files', async () => {
    const { buffer, manifest, missing } = await createBackup(fakeDb().db, d('2026-09-30T10:00:00.000Z'));
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
  it('rejects a backup that is too large once unpacked', () => {
    process.env.BACKUP_MAX_UNPACKED_MB = '1';
    try {
      const big = zipWith({ format: 'cognatio-backup', version: BACKUP_VERSION }, undefined, { 'files/big.bin': new Uint8Array(2 * 1024 * 1024) });
      expect(reason(() => readBackup(big))).toBe('UNPACKED_TOO_LARGE');
    } finally {
      delete process.env.BACKUP_MAX_UNPACKED_MB;
    }
  });

  it('reads its own backup back with dates restored', async () => {
    const { buffer } = await createBackup(fakeDb().db);
    const backup = readBackup(buffer);
    expect(backup.data.persons).toHaveLength(3);
    expect(backup.data.persons[0].createdAt).toEqual(stamps.createdAt);
    expect(backup.data.familyTrees[1].deletedAt).toEqual(d('2026-03-01T00:00:00.000Z'));
    expect(backup.files.has('a.jpg')).toBe(true);
    expect(backup.missingFiles).toEqual(['fehlt.pdf']);
  });

  it('rejects files that are no backup', () => {
    expect(reason(() => readBackup(Buffer.from('hallo')))).toBe('BACKUP_INVALID');
    expect(reason(() => readBackup(Buffer.from(zipSync({ 'x.txt': strToU8('x') }))))).toBe('BACKUP_INVALID');
    expect(reason(() => readBackup(zipWith({ format: 'anders', version: 1 })))).toBe('BACKUP_INVALID');
  });

  it('points to Import/Export for an export of a single family tree', () => {
    const zip = Buffer.from(zipSync({ 'persons.json': strToU8('{}') }));
    expect(reason(() => readBackup(zip))).toBe('BACKUP_IS_EXPORT');
  });

  it('rejects backups of a newer version', () => {
    expect(reason(() => readBackup(zipWith({ format: 'cognatio-backup', version: BACKUP_VERSION + 1 })))).toBe('BACKUP_TOO_NEW');
  });

  it('detects a modified data.json by its checksum', async () => {
    const { buffer } = await createBackup(fakeDb().db);
    const entries = unzipSync(buffer);
    entries['data.json'] = strToU8(strFromU8(entries['data.json']).replace('Mustermann', 'Anders'));
    expect(reason(() => readBackup(Buffer.from(zipSync(entries))))).toBe('BACKUP_CHECKSUM');
  });

  it('reports broken references and duplicate ids', async () => {
    const { buffer } = await createBackup(fakeDb().db);
    const entries = unzipSync(buffer);
    const manifest = JSON.parse(strFromU8(entries['manifest.json']));
    const data = JSON.parse(strFromU8(entries['data.json']));
    data.relations[0].personBId = 'unbekannt';
    data.notes.push(data.notes[0]);
    try {
      readBackup(zipWith(manifest, data));
      throw new Error('kein Fehler');
    } catch (err) {
      expect((err as TransferError).reason).toBe('INTEGRITY');
      expect((err as TransferError).details).toEqual(['notes: id n1 duplicated', 'Relation r1: person missing']);
    }
  });

  it('requires a family tree outside the recycle bin', async () => {
    const data = rows();
    data.familyTrees[0].isDeleted = true;
    const { buffer } = await createBackup(fakeDb(data).db);
    expect(reason(() => readBackup(buffer))).toBe('INTEGRITY');
  });

  it('rejects file names that would leave the upload folder', async () => {
    const data = rows();
    data.media[0].fileName = '../../etc/passwd';
    const { buffer } = await createBackup(fakeDb(data).db);
    expect(reason(() => readBackup(buffer))).toBe('BACKUP_INVALID');
  });
});

describe('restoreBackup', () => {
  it('replaces everything in one transaction and swaps the files afterwards', async () => {
    const backup = readBackup((await createBackup(fakeDb().db)).buffer);
    // Current data: another file that is no longer needed after the restore
    fs.writeFileSync(path.join(tmpDir, 'alt.png'), 'alt');
    fs.writeFileSync(path.join(tmpDir, 'a.jpg'), 'veraltet');
    fs.writeFileSync(path.join(tmpDir, 'fremd.txt'), 'nicht von der App');
    const current = rows();
    current.media = [{ ...current.media[0], fileName: 'alt.png' }];
    const { db, calls, inserted } = fakeDb(current);

    const counts = await restoreBackup(db, backup);

    expect(counts).toMatchObject({ trees: 1, deletedTrees: 1, persons: 2, deletedPersons: 1 });
    expect(calls.slice(0, 8).every((c) => c.startsWith('delete'))).toBe(true);
    expect(calls.slice(8)).toEqual([
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
    const backup = readBackup((await createBackup(fakeDb().db)).buffer);
    fs.writeFileSync(path.join(tmpDir, 'a.jpg'), 'aktuell');
    const current = rows();
    const { db } = fakeDb(current, { failInsert: true });

    await expect(restoreBackup(db, backup)).rejects.toThrow('Insert failed');
    expect(fs.readFileSync(path.join(tmpDir, 'a.jpg'), 'utf8')).toBe('aktuell');
    expect(fs.readdirSync(tmpDir).filter((n) => n.startsWith('.'))).toEqual([]);
  });

  it('writes large tables in chunks', async () => {
    const data = rows();
    data.notes = Array.from({ length: 2500 }, (_, i) => ({ id: `n${i}`, personId: 'p1', text: 'x', ...stamps }));
    const backup = readBackup((await createBackup(fakeDb(data).db)).buffer);
    const { db } = fakeDb();
    await restoreBackup(db, backup);
    expect((db as unknown as { note: { createMany: jest.Mock } }).note.createMany).toHaveBeenCalledTimes(3);
  });
});

describe('writeSafetyBackup', () => {
  it('stores the current state in the backup folder', async () => {
    const dir = path.join(tmpDir, 'backups');
    const name = await writeSafetyBackup(fakeDb().db, dir, new Date(2026, 8, 30, 14, 30, 5));
    expect(name).toBe('cognatio_before_restore_20260930_143005.zip');
    expect(readBackup(fs.readFileSync(path.join(dir, name))).data.persons).toHaveLength(3);
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
