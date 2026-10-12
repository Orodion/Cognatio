import fs from 'fs';
import os from 'os';
import path from 'path';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { prismaMock } from '../../test/prismaMock.js';
import { appVersion, backupDir, latestBackup, systemInfo } from '../systemInfo.js';

const db = prismaMock as unknown as PrismaClient;
let dir: string;
const env = { ...process.env };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-backups-'));
  process.env.BACKUP_DIR = dir;
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  process.env = { ...env };
});

describe('latestBackup', () => {
  it('finds the newest database dump', () => {
    fs.writeFileSync(path.join(dir, 'cognatio_db_1.dump'), 'a');
    fs.writeFileSync(path.join(dir, 'cognatio_db_2.dump'), 'b');
    fs.writeFileSync(path.join(dir, 'uploads_2.tar.gz'), 'c');
    fs.utimesSync(path.join(dir, 'cognatio_db_1.dump'), new Date('2026-09-01T00:00:00Z'), new Date('2026-09-01T00:00:00Z'));
    fs.utimesSync(path.join(dir, 'cognatio_db_2.dump'), new Date('2026-09-02T00:00:00Z'), new Date('2026-09-02T00:00:00Z'));
    expect(latestBackup(dir)).toEqual({ at: '2026-09-02T00:00:00.000Z', count: 2 });
  });

  it('also counts the dumps of the Windows app in the subfolder db/', () => {
    fs.mkdirSync(path.join(dir, 'db'));
    fs.writeFileSync(path.join(dir, 'db', 'cognatio-db-20260903-120000-daily.dump'), 'a');
    fs.utimesSync(path.join(dir, 'db', 'cognatio-db-20260903-120000-daily.dump'), new Date('2026-09-03T00:00:00Z'), new Date('2026-09-03T00:00:00Z'));
    expect(latestBackup(dir)).toEqual({ at: '2026-09-03T00:00:00.000Z', count: 1 });
  });

  it('copes with a missing or empty folder', () => {
    expect(latestBackup(path.join(dir, 'fehlt'))).toEqual({ at: null, count: 0 });
    expect(latestBackup(dir)).toEqual({ at: null, count: 0 });
  });
});

describe('backupDir', () => {
  it('uses BACKUP_DIR, otherwise backups/ in the data folder of an installation, otherwise next to backend/', () => {
    expect(backupDir()).toBe(path.resolve(dir));
    process.env.COGNATIO_DATA_DIR = path.join(dir, 'data');
    expect(backupDir()).toBe(path.resolve(dir));
    delete process.env.BACKUP_DIR;
    expect(backupDir()).toBe(path.join(dir, 'data', 'backups'));
    delete process.env.COGNATIO_DATA_DIR;
    expect(backupDir()).toBe(path.resolve(process.cwd(), '..', 'backups'));
  });
});

describe('appVersion', () => {
  it('prefers APP_VERSION and otherwise reads package.json', () => {
    process.env.APP_VERSION = '2.1.0-ci';
    expect(appVersion()).toBe('2.1.0-ci');
    delete process.env.APP_VERSION;
    expect(appVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('systemInfo', () => {
  it('summarises data, backups and settings', async () => {
    fs.writeFileSync(path.join(dir, 'cognatio_db_1.dump'), 'a');
    prismaMock.person.count.mockResolvedValueOnce(42).mockResolvedValueOnce(3);
    prismaMock.media.aggregate.mockResolvedValueOnce({ _count: { _all: 5 }, _sum: { sizeBytes: 2048 } } as never);
    prismaMock.importRecord.findFirst.mockResolvedValueOnce({ importedAt: new Date('2026-09-20T08:00:00Z') } as never);

    expect(await systemInfo(db)).toMatchObject({
      database: 'ok',
      persons: 42,
      deletedPersons: 3,
      media: 5,
      mediaBytes: 2048,
      lastImportAt: '2026-09-20T08:00:00.000Z',
      backupCount: 1,
      backupDir: path.resolve(dir),
      logLevel: 'silent',
    });
  });

  it('reports an unreachable database instead of failing', async () => {
    prismaMock.person.count.mockRejectedValue(new Error('down'));
    prismaMock.media.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { sizeBytes: null } } as never);
    prismaMock.importRecord.findFirst.mockResolvedValue(null);
    expect(await systemInfo(db)).toMatchObject({ database: 'unreachable', persons: 0, lastBackupAt: null });
  });
});
