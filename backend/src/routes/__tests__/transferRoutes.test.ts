import fs from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';
import { prismaMock } from '../../test/prismaMock.js';
import { removeTestDir, testDir } from '../../test/archives.js';

const tmpDir = testDir('transfer-routes');
jest.mock('../../lib/files/uploads.js', () => ({ ...jest.requireActual('../../lib/files/uploads.js'), uploadDir: tmpDir }));
jest.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

import { strToU8, zipSync } from 'fflate';
import transferRoutes from '../transferRoutes.js';
import jobRoutes from '../jobRoutes.js';
import { stagingDir } from '../../lib/files/stagedUploads.js';
import { person, transfer } from '../../test/transferFixtures.js';

const app = express();
app.use('/api/v1', transferRoutes);
app.use('/api/v1', jobRoutes);

afterAll(() => removeTestDir(tmpDir));

const photo = {
  id: 'm1',
  path: 'media/Muster_a/muster_a_foto_1.jpg',
  originalFileName: 'Foto.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 3,
  type: 'PHOTO',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** An export of the app with one person and one photo */
const exportFile = () =>
  Buffer.from(
    zipSync({
      'persons.json': strToU8(JSON.stringify(transfer([person('a', { media: [photo] })]))),
      [photo.path]: new Uint8Array([1, 2, 3]),
    }),
  );

beforeEach(() => {
  prismaMock.familyTree.findFirst.mockResolvedValue({ id: 't1' } as never);
  for (const table of ['person', 'relation', 'event', 'note', 'media', 'importRecord'] as const) {
    (prismaMock[table].findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock[table].createMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prismaMock[table].deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  }
  (prismaMock.eventMedia.createMany as jest.Mock).mockResolvedValue({ count: 0 });
  prismaMock.familyTree.create.mockResolvedValue({ id: 't-neu' } as never);
  prismaMock.importRecord.create.mockResolvedValue({} as never);
  prismaMock.$transaction.mockImplementation((async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock)) as never);
});

async function upload(file: Buffer, name = 'familie.zip') {
  const res = await request(app).post('/api/v1/import/upload').attach('file', file, name);
  expect(res.status).toBe(201);
  return res.body.uploadId as string;
}

async function finished(jobId: string) {
  for (;;) {
    const res = await request(app).get(`/api/v1/jobs/${jobId}`);
    if (res.body.state !== 'running') {
      return res.body as { state: string; status: number; result: Record<string, unknown> };
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('import', () => {
  it('uploads the file once; preview and execution refer to it', async () => {
    const uploadId = await upload(exportFile());
    const preview = await request(app).post('/api/v1/import/preview').send({ uploadId, target: 'NEW' });
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({ kind: 'ZIP', target: 'NEW', importedPersons: 1, missingFiles: [], suggestedTreeName: 'Muster' });

    const start = await request(app).post('/api/v1/import/execute').send({ uploadId, strategy: 'OVERWRITE', target: 'NEW', treeName: 'Neu' });
    expect(start.status).toBe(202);
    const job = await finished(start.body.jobId);
    expect(job).toMatchObject({ state: 'done', status: 200, result: { familyTreeId: 't-neu', createdPersons: 1, createdMedia: 1, missingFiles: [] } });

    // The photo was copied out of the archive into the upload folder, the uploaded file is gone
    const stored = fs.readdirSync(tmpDir).filter((name) => name.endsWith('.jpg'));
    expect(stored).toHaveLength(1);
    expect(prismaMock.media.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ fileName: stored[0], sizeBytes: 3 })] });
    expect(prismaMock.importRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fileName: 'familie.zip', fileHash: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    });
    expect(fs.readdirSync(stagingDir())).toEqual([]);
  });

  it('answers a wrong strategy and an unknown upload at once', async () => {
    const uploadId = await upload(exportFile());
    const wrong = await request(app).post('/api/v1/import/execute').send({ uploadId, strategy: 'IRGENDWIE' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.reason).toBe('INVALID_STRATEGY');

    const gone = await request(app).post('/api/v1/import/execute').send({ uploadId: 'unbekannt', strategy: 'OVERWRITE' });
    expect(gone.status).toBe(410);
    expect(gone.body.reason).toBe('UPLOAD_NOT_FOUND');
  });

  it('reports a damaged file in the preview without touching the data', async () => {
    const uploadId = await upload(Buffer.from('PK kaputt'));
    const res = await request(app).post('/api/v1/import/preview').send({ uploadId });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('INVALID_ZIP');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('fails as a job when the drive has no room for the media', async () => {
    const uploadId = await upload(exportFile());
    const statfs = jest.spyOn(fs.promises, 'statfs').mockResolvedValue({ bavail: 1, bsize: 4096 } as never);
    try {
      const start = await request(app).post('/api/v1/import/execute').send({ uploadId, strategy: 'OVERWRITE', target: 'NEW' });
      const job = await finished(start.body.jobId);
      expect(job).toMatchObject({ state: 'failed', status: 413, result: { reason: 'NOT_ENOUGH_SPACE' } });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    } finally {
      statfs.mockRestore();
    }
  });
});

describe('export', () => {
  beforeEach(() => {
    fs.writeFileSync(`${tmpDir}/abc.jpg`, Buffer.from([1, 2, 3]));
    prismaMock.person.findMany.mockResolvedValue([
      {
        ...person('a'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        events: [],
        notes: [],
        media: [{ ...photo, fileName: 'abc.jpg', sizeBytes: BigInt(3), createdAt: new Date(), updatedAt: new Date() }],
      },
    ] as never);
  });

  it('tells name, size and missing media first, then sends exactly that size', async () => {
    const check = await request(app).get('/api/v1/export/zip?check=1');
    expect(check.status).toBe(200);
    expect(check.body).toMatchObject({ filename: expect.stringMatching(/^family_tree_Muster_\d{8}_\d{6}\.zip$/), missingMedia: 0 });

    const res = await request(app)
      .get('/api/v1/export/zip')
      .buffer(true)
      .parse((r, done) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="family_tree_Muster_\d{8}_\d{6}\.zip"/);
    expect(Number(res.headers['content-length'])).toBe(check.body.size);
    expect((res.body as Buffer).length).toBe(check.body.size);
  });

  it('counts the bytes it sends under the id the page chose, so the page sees progress and end', async () => {
    const id = '0f0e0d0c-0b0a-4908-8706-050403020100';
    const res = await request(app)
      .get(`/api/v1/export/zip?activity=${id}`)
      .buffer(true)
      .parse((r, done) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    const job = await request(app).get(`/api/v1/jobs/${id}`);
    expect(job.body).toMatchObject({
      operation: 'export',
      label: expect.stringMatching(/\.zip$/),
      state: 'done',
      phase: 'download',
      done: (res.body as Buffer).length,
      total: (res.body as Buffer).length,
      result: { missingMedia: 0 },
    });
  });

  it('breaks a download off when the page cancels it', async () => {
    // A medium large enough that the download is still running when the page cancels
    fs.writeFileSync(`${tmpDir}/abc.jpg`, Buffer.alloc(64 * 1024 * 1024, 1));
    const id = '1f1e1d1c-1b1a-4918-8716-151413121110';
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    try {
      await new Promise<void>((resolve) => {
        http.get(`http://127.0.0.1:${port}/api/v1/export/zip?activity=${id}`, (res) => {
          res.once('data', async () => {
            res.pause();
            // The job runs and appears in the list of running jobs
            const running = await request(app).get('/api/v1/jobs');
            expect(running.body).toEqual([expect.objectContaining({ id, operation: 'export', state: 'running', cancellable: true })]);
            expect((await request(app).delete(`/api/v1/jobs/${id}`)).status).toBe(202);
            res.resume();
          });
          res.on('error', () => resolve());
          res.on('close', () => resolve());
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect((await request(app).get(`/api/v1/jobs/${id}`)).body).toMatchObject({ state: 'cancelled', result: { reason: 'CANCELLED' } });
      expect((await request(app).get('/api/v1/jobs')).body).toEqual([]);
    } finally {
      server.close();
    }
  });

  it('refuses an export above the optional limit before anything is sent', async () => {
    process.env.IMPORT_MAX_MB = '0.000001';
    try {
      const res = await request(app).get('/api/v1/export/zip?check=1');
      expect(res.status).toBe(413);
      expect(res.body.reason).toBe('EXPORT_TOO_LARGE');
    } finally {
      delete process.env.IMPORT_MAX_MB;
    }
  });

  it('checks a GEDCOM export without media as well', async () => {
    const res = await request(app).get('/api/v1/export/gedcom?check=1&version=7.0');
    expect(res.body).toMatchObject({ filename: expect.stringMatching(/_gedcom70\.ged$/), missingMedia: 0 });
    expect(res.body.size).toBeGreaterThan(0);
  });
});
