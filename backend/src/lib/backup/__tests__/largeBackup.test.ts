import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { removeTestDir, testDir } from '../../../test/archives.js';

/**
 * Backup and restore of a medium above 4 GB (a ZIP64 archive) without holding it in memory. Needs about 15 GB of free
 * disk and a few minutes, so it runs only on request: COGNATIO_LARGE_TESTS=1 npx jest largeBackup
 */
const suite = process.env.COGNATIO_LARGE_TESTS === '1' ? describe : describe.skip;

const tmpDir = testDir('large-uploads');
const work = testDir('large-work');
jest.mock('../../files/uploads.js', () => ({ ...jest.requireActual('../../files/uploads.js'), uploadDir: tmpDir }));

import { createBackup, readBackup, restoreBackup } from '../backup.js';
import { writeZipFile } from '../../files/zipWriter.js';

afterAll(() => {
  removeTestDir(tmpDir);
  removeTestDir(work);
});

const GB = 1024 ** 3;
const SIZE = 5 * GB + 12_345;
const CHUNK = 8 * 1024 * 1024;

/** Content that changes along the file, so a mixed-up piece would show in the checksum and in the samples */
function chunk(index: number, length: number) {
  const buffer = Buffer.alloc(length, index % 251);
  buffer.writeUInt32LE(index, 0);
  return buffer;
}

async function writeLargeFile(file: string) {
  async function* pieces() {
    for (let offset = 0, index = 0; offset < SIZE; offset += CHUNK, index++) {
      yield chunk(index, Math.min(CHUNK, SIZE - offset));
    }
  }
  await pipeline(Readable.from(pieces()), fs.createWriteStream(file));
}

/** Reads `length` bytes at `position` of a file */
function sample(file: string, position: number, length: number) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, position);
    return buffer;
  } finally {
    fs.closeSync(fd);
  }
}

const stamps = { createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') };

function fakeDb() {
  const data: Record<string, unknown[]> = {
    familyTrees: [{ id: 't1', name: 'Groß', description: null, isDeleted: false, deletedAt: null, ...stamps }],
    persons: [],
    relations: [],
    events: [],
    notes: [],
    media: [
      {
        id: 'm1',
        familyTreeId: 't1',
        personId: null,
        fileName: 'film.mp4',
        originalFileName: 'Familienfilm.mp4',
        mimeType: 'video/mp4',
        sizeBytes: BigInt(SIZE),
        type: 'OTHER',
        ...stamps,
      },
    ],
    eventMedia: [],
    imports: [],
  };
  const table = (name: string) => ({
    findMany: jest.fn(async () => data[name]),
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async ({ data: rows }: { data: unknown[] }) => ({ count: rows.length })),
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
  return { ...db, $transaction: jest.fn(async (fn: (tx: typeof db) => unknown) => fn(db)) } as never;
}

suite('backup above 4 GB', () => {
  it(
    'writes and restores a 5 GB medium piece by piece, with little memory',
    async () => {
      const original = path.join(tmpDir, 'film.mp4');
      await writeLargeFile(original);
      const before = [sample(original, 0, 64), sample(original, 4 * GB + 7, 64), sample(original, SIZE - 64, 64)];

      // Peak of the memory while the archive is written and read
      global.gc?.();
      const baseline = process.memoryUsage().rss;
      let peak = baseline;
      const watch = setInterval(() => (peak = Math.max(peak, process.memoryUsage().rss)), 50);
      try {
        const { zip } = await createBackup(fakeDb());
        const expected = await zip.size;
        const backupFile = path.join(work, 'backup.zip');
        await writeZipFile(zip, backupFile);
        expect(fs.statSync(backupFile).size).toBe(expected);
        expect(expected).toBeGreaterThan(SIZE);

        // The medium is gone; the restore brings it back from the archive
        fs.rmSync(original);
        const backup = await readBackup(backupFile);
        try {
          expect(backup.files.size('film.mp4')).toBe(SIZE);
          await restoreBackup(fakeDb(), backup);
        } finally {
          backup.close();
        }
      } finally {
        clearInterval(watch);
      }

      expect(fs.statSync(original).size).toBe(SIZE);
      expect([sample(original, 0, 64), sample(original, 4 * GB + 7, 64), sample(original, SIZE - 64, 64)]).toEqual(before);
      // A few hundred MB at most – the file itself never was in memory
      expect(peak - baseline).toBeLessThan(300 * 1024 * 1024);
    },
    30 * 60_000,
  );
});
