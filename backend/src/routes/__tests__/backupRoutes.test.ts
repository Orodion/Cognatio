import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { strToU8, zipSync } from 'fflate';
import { prismaMock } from '../../test/prismaMock.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-backup-routes-'));
const backupFolder = path.join(tmpDir, 'backups');
jest.mock('../../lib/files/uploads.js', () => ({ uploadDir: tmpDir }));
jest.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

import backupRoutes, { RESTORE_CONFIRMATION } from '../backupRoutes.js';

const app = express();
app.use('/api/v1', backupRoutes);

const stamps = { createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') };
const tree = { id: 't1', name: 'Mustermann', description: null, isDeleted: false, deletedAt: null, ...stamps };

beforeEach(() => {
  process.env.BACKUP_DIR = backupFolder;
  // Data: one empty family tree
  prismaMock.familyTree.findMany.mockResolvedValue([tree] as never);
  for (const table of ['person', 'relation', 'event', 'note', 'media', 'eventMedia', 'importRecord'] as const) {
    (prismaMock[table].findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock[table].count as jest.Mock).mockResolvedValue(0);
  }
  prismaMock.familyTree.count.mockResolvedValue(1);
  prismaMock.$transaction.mockImplementation((async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock)) as never);
});
afterEach(() => {
  delete process.env.BACKUP_DIR;
  fs.rmSync(backupFolder, { recursive: true, force: true });
});
afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const binary = (res: request.Response, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

async function downloadBackup() {
  const res = await request(app).get('/api/v1/backup').buffer(true).parse(binary);
  return res;
}

describe('GET /api/v1/backup', () => {
  it('downloads all family trees as one ZIP file', async () => {
    const res = await downloadBackup();
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toMatch(/cognatio_backup_\d{8}_\d{6}\.zip/);
    expect(res.headers['x-missing-media']).toBe('0');
    // Within the limit: no warning
    expect(res.headers['x-backup-size-mb']).toBeUndefined();
  });
});

describe('GET /api/v1/backup - limit', () => {
  it('still creates a backup that is larger than the limit for restoring, and reports size and limit', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.jpg'), 'img');
    (prismaMock.media.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'm1',
        fileName: 'a.jpg',
        originalFileName: 'a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
        type: 'PHOTO',
        personId: null,
        familyTreeId: 't1',
        ...stamps,
      },
    ]);
    process.env.BACKUP_MAX_MB = '0.000001';
    try {
      const res = await request(app).get('/api/v1/backup').buffer(true).parse(binary);
      expect(res.status).toBe(200);
      expect(res.headers['x-backup-limit-mb']).toBe('1');
      expect(Number(res.headers['x-backup-size-mb'])).toBeGreaterThanOrEqual(1);
    } finally {
      delete process.env.BACKUP_MAX_MB;
    }
  });
});

describe('POST /api/v1/backup/preview', () => {
  it('describes the backup and the current state without changing anything', async () => {
    const file = (await downloadBackup()).body as Buffer;
    const res = await request(app).post('/api/v1/backup/preview').attach('file', file, 'sicherung.zip');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ counts: { trees: 1, persons: 0 }, current: { trees: 1 }, trees: [{ name: 'Mustermann' }], missingFiles: 0 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an export of a single family tree with a hint', async () => {
    const file = Buffer.from(zipSync({ 'persons.json': strToU8('{}') }));
    const res = await request(app).post('/api/v1/backup/preview').attach('file', file, 'export.zip');
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('BACKUP_IS_EXPORT');
  });

  it('requires a file', async () => {
    const res = await request(app).post('/api/v1/backup/preview');
    expect(res.body.reason).toBe('NO_FILE');
  });
});

describe('POST /api/v1/backup/restore', () => {
  it('refuses without the confirmation', async () => {
    const file = (await downloadBackup()).body as Buffer;
    const res = await request(app).post('/api/v1/backup/restore').attach('file', file, 'sicherung.zip');
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('RESTORE_NOT_CONFIRMED');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('does not touch the data when the file is invalid', async () => {
    const res = await request(app).post('/api/v1/backup/restore').field('confirm', RESTORE_CONFIRMATION).attach('file', Buffer.from('kaputt'), 'sicherung.zip');
    expect(res.body.reason).toBe('BACKUP_INVALID');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(fs.existsSync(backupFolder)).toBe(false);
  });

  it('saves the current state first, then restores', async () => {
    const file = (await downloadBackup()).body as Buffer;
    const res = await request(app).post('/api/v1/backup/restore').field('confirm', RESTORE_CONFIRMATION).attach('file', file, 'sicherung.zip');
    expect(res.status).toBe(200);
    expect(res.body.safetyBackup).toMatch(/^cognatio_before_restore_\d{8}_\d{6}\.zip$/);
    expect(fs.existsSync(path.join(backupFolder, res.body.safetyBackup))).toBe(true);
    expect(res.body.counts).toMatchObject({ trees: 1 });
    expect(prismaMock.familyTree.deleteMany).toHaveBeenCalled();
    expect(prismaMock.familyTree.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: 't1', name: 'Mustermann' })] });
  });

  it('does not restore when the safety backup cannot be written', async () => {
    const file = (await downloadBackup()).body as Buffer;
    // The storage location is a file instead of a folder
    fs.writeFileSync(path.join(tmpDir, 'blockiert'), '');
    process.env.BACKUP_DIR = path.join(tmpDir, 'blockiert');
    const res = await request(app).post('/api/v1/backup/restore').field('confirm', RESTORE_CONFIRMATION).attach('file', file, 'sicherung.zip');
    expect(res.body.reason).toBe('SAFETY_BACKUP_FAILED');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
