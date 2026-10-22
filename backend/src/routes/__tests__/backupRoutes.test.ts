import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { strToU8, zipSync } from 'fflate';
import { prismaMock } from '../../test/prismaMock.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-backup-routes-'));
const backupFolder = path.join(tmpDir, 'backups');
jest.mock('../../lib/files/uploads.js', () => ({ ...jest.requireActual('../../lib/files/uploads.js'), uploadDir: tmpDir }));
jest.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

import backupRoutes, { RESTORE_CONFIRMATION } from '../backupRoutes.js';
import jobRoutes from '../jobRoutes.js';
import { stagingDir } from '../../lib/files/stagedUploads.js';
import { exclusive } from '../../lib/transfer/oneAtATime.js';

const app = express();
app.use('/api/v1', backupRoutes);
app.use('/api/v1', jobRoutes);

const stamps = { createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') };
const tree = { id: 't1', name: 'Mustermann', description: null, isDeleted: false, deletedAt: null, ...stamps };

beforeEach(() => {
  process.env.BACKUP_DIR = backupFolder;
  // Data: one empty family tree
  prismaMock.familyTree.findMany.mockResolvedValue([tree] as never);
  for (const table of [
    'person',
    'relation',
    'event',
    'note',
    'media',
    'eventMedia',
    'importRecord',
    'repository',
    'source',
    'citation',
    'sourceMedia',
    'citationMedia',
    'personCitation',
    'eventCitation',
    'relationCitation',
  ] as const) {
    (prismaMock[table].findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock[table].count as jest.Mock).mockResolvedValue(0);
  }
  prismaMock.familyTree.count.mockResolvedValue(1);
  prismaMock.media.aggregate.mockResolvedValue({ _sum: { sizeBytes: BigInt(5_000_000_000) } } as never);
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

/** Uploads a backup file once and returns its id */
async function upload(file: Buffer, name = 'sicherung.zip') {
  const res = await request(app).post('/api/v1/backup/upload').attach('file', file, name);
  expect(res.status).toBe(201);
  expect(res.body.size).toBe(file.length);
  return res.body.uploadId as string;
}

/** Follows a job until it has finished and returns status and answer */
async function finished(jobId: string) {
  for (;;) {
    const res = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(res.status).toBe(200);
    if (res.body.state !== 'running') {
      return res.body as { state: string; status: number; result: Record<string, unknown> };
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Starts a restore and waits for its end */
async function restore(uploadId: string, confirm: string | null = RESTORE_CONFIRMATION) {
  const res = await request(app).post('/api/v1/backup/restore').send({ uploadId, confirm });
  if (res.status !== 202) {
    return { state: 'refused', status: res.status, result: res.body };
  }
  return finished(res.body.jobId);
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
    expect(Number(res.headers['content-length'])).toBe((res.body as Buffer).length);
  });

  it('answers name, size and missing media first when asked to check', async () => {
    const res = await request(app).get('/api/v1/backup?check=1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ filename: expect.stringMatching(/^cognatio_backup_\d{8}_\d{6}\.zip$/), missingMedia: 0, overLimit: null });
    expect(res.body.size).toBe(((await downloadBackup()).body as Buffer).length);
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

describe('POST /api/v1/backup/upload', () => {
  it('keeps the file in the staging folder; a newer upload replaces it', async () => {
    const first = await upload(Buffer.from('eins'));
    expect(fs.readdirSync(stagingDir())).toHaveLength(1);
    const second = await upload(Buffer.from('zwei'));
    expect(second).not.toBe(first);
    expect(fs.readdirSync(stagingDir())).toHaveLength(1);
    const res = await request(app).post('/api/v1/backup/preview').send({ uploadId: first });
    expect(res.status).toBe(410);
    expect(res.body.reason).toBe('UPLOAD_NOT_FOUND');
  });

  it('requires a file', async () => {
    const res = await request(app).post('/api/v1/backup/upload');
    expect(res.body.reason).toBe('NO_FILE');
  });

  it('refuses a file above the optional limit', async () => {
    process.env.BACKUP_MAX_MB = '0.000001';
    try {
      const res = await request(app).post('/api/v1/backup/upload').attach('file', Buffer.alloc(100), 'sicherung.zip');
      expect(res.status).toBe(413);
      expect(res.body).toMatchObject({ reason: 'TOO_LARGE', params: { limitMb: 1 } });
    } finally {
      delete process.env.BACKUP_MAX_MB;
    }
  });
});

describe('POST /api/v1/backup/preview', () => {
  it('describes the backup and the current state without changing anything', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    const res = await request(app).post('/api/v1/backup/preview').send({ uploadId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      counts: { trees: 1, persons: 0 },
      current: { trees: 1 },
      currentMediaBytes: 5_000_000_000,
      trees: [{ name: 'Mustermann' }],
      missingFiles: 0,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an export of a single family tree with a hint', async () => {
    const uploadId = await upload(Buffer.from(zipSync({ 'persons.json': strToU8('{}') })), 'export.zip');
    const res = await request(app).post('/api/v1/backup/preview').send({ uploadId });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('BACKUP_IS_EXPORT');
  });

  it('asks for the file again without a valid upload', async () => {
    const res = await request(app).post('/api/v1/backup/preview').send({ uploadId: 'unbekannt' });
    expect(res.status).toBe(410);
    expect(res.body.reason).toBe('UPLOAD_NOT_FOUND');
  });
});

describe('POST /api/v1/backup/restore', () => {
  it('refuses without the confirmation', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    const job = await restore(uploadId, null);
    expect(job.status).toBe(400);
    expect(job.result.reason).toBe('RESTORE_NOT_CONFIRMED');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('does not touch the data when the file is invalid', async () => {
    const job = await restore(await upload(Buffer.from('kaputt')));
    expect(job.state).toBe('failed');
    expect(job.result.reason).toBe('BACKUP_INVALID');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(fs.existsSync(backupFolder)).toBe(false);
  });

  it('saves the current state first, then restores, and removes the uploaded file', async () => {
    const job = await restore(await upload((await downloadBackup()).body as Buffer));
    expect(job).toMatchObject({ state: 'done', status: 200 });
    expect(job.result.safetyBackup).toMatch(/^cognatio_before_restore_\d{8}_\d{6}\.zip$/);
    expect(fs.existsSync(path.join(backupFolder, job.result.safetyBackup as string))).toBe(true);
    expect(job.result.counts).toMatchObject({ trees: 1 });
    expect(prismaMock.familyTree.deleteMany).toHaveBeenCalled();
    expect(prismaMock.familyTree.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: 't1', name: 'Mustermann' })] });
    expect(fs.readdirSync(stagingDir())).toEqual([]);
  });

  it('does not restore when the safety backup cannot be written', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    // The storage location is a file instead of a folder
    fs.writeFileSync(path.join(tmpDir, 'blockiert'), '');
    process.env.BACKUP_DIR = path.join(tmpDir, 'blockiert');
    const job = await restore(uploadId);
    expect(job.result.reason).toBe('SAFETY_BACKUP_FAILED');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('does not start when the drive has no room for the safety backup', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    const statfs = jest.spyOn(fs.promises, 'statfs').mockResolvedValue({ bavail: 1, bsize: 4096 } as never);
    try {
      const job = await restore(uploadId);
      expect(job).toMatchObject({ state: 'failed', status: 413, result: { reason: 'NOT_ENOUGH_SPACE' } });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    } finally {
      statfs.mockRestore();
    }
  });

  it('waits for a running operation (e.g. the download of the current state) instead of refusing', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    // Another operation holds the guard, like a download that is still being sent
    const release = await exclusive('backup');
    const start = await request(app).post('/api/v1/backup/restore').send({ uploadId, confirm: RESTORE_CONFIRMATION });
    expect(start.status).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await request(app).get(`/api/v1/jobs/${start.body.jobId}`)).body).toMatchObject({ state: 'running', phase: 'waiting' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    release();
    expect(await finished(start.body.jobId)).toMatchObject({ state: 'done' });
  });

  it('lets a second restore of the same file fail clearly once the first one used it', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    const release = await exclusive('backup');
    const first = await request(app).post('/api/v1/backup/restore').send({ uploadId, confirm: RESTORE_CONFIRMATION });
    const second = await request(app).post('/api/v1/backup/restore').send({ uploadId, confirm: RESTORE_CONFIRMATION });
    release();
    expect(await finished(first.body.jobId)).toMatchObject({ state: 'done' });
    expect(await finished(second.body.jobId)).toMatchObject({ state: 'failed', status: 410, result: { reason: 'UPLOAD_NOT_FOUND' } });
  });

  it('can be cancelled while it waits, and then frees the uploaded file', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    const release = await exclusive('backup');
    const start = await request(app).post('/api/v1/backup/restore').send({ uploadId, confirm: RESTORE_CONFIRMATION });
    expect((await request(app).delete(`/api/v1/jobs/${start.body.jobId}`)).status).toBe(202);
    expect(await finished(start.body.jobId)).toMatchObject({ state: 'cancelled', result: { reason: 'CANCELLED' } });
    release();
    // Free again: a newer upload replaces it
    await upload(Buffer.from('neu'));
    expect(fs.readdirSync(stagingDir())).toHaveLength(1);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('refuses an upload that does not fit on the drive before storing it', async () => {
    const stored = () => (fs.existsSync(stagingDir()) ? fs.readdirSync(stagingDir()) : []);
    const before = stored();
    const statfs = jest.spyOn(fs.promises, 'statfs').mockResolvedValue({ bavail: 1, bsize: 4096 } as never);
    try {
      const res = await request(app).post('/api/v1/backup/upload').attach('file', Buffer.alloc(100), 'sicherung.zip');
      expect(res.status).toBe(413);
      expect(res.body.reason).toBe('NOT_ENOUGH_SPACE');
      expect(stored()).toEqual(before);
    } finally {
      statfs.mockRestore();
    }
  });

  it('keeps the uploaded file of a running restore when a newer one arrives', async () => {
    const uploadId = await upload((await downloadBackup()).body as Buffer);
    const release = await exclusive('backup');
    const start = await request(app).post('/api/v1/backup/restore').send({ uploadId, confirm: RESTORE_CONFIRMATION });
    await upload(Buffer.from('andere Datei'));
    release();
    expect(await finished(start.body.jobId)).toMatchObject({ state: 'done' });
  });
});
