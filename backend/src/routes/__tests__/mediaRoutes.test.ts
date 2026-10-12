import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { prismaMock } from '../../test/prismaMock.js';

// Write uploads to a temporary directory instead of backend/uploads
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-upload-'));
jest.mock('../../lib/files/uploads.js', () => ({ ...jest.requireActual('../../lib/files/uploads.js'), uploadDir: tmpDir }));
jest.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

import mediaRoutes, { MAX_UPLOAD_MB } from '../mediaRoutes.js';

const app = express();
app.use('/api/v1/media', mediaRoutes);

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const filesInUploadDir = () => fs.readdirSync(tmpDir);

beforeEach(() => {
  prismaMock.familyTree.findFirst.mockResolvedValue({ id: 'tree-1' } as never);
  // The writes run in one transaction – here on the same mock
  prismaMock.$transaction.mockImplementation(((write: (tx: typeof prismaMock) => unknown) => write(prismaMock)) as never);
  // In the transaction: family tree locked, the person is still there and not in the recycle bin
  prismaMock.familyTree.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.person.findFirst.mockResolvedValue({ id: 'p1', isDeleted: false } as never);
});

afterEach(() => {
  for (const f of filesInUploadDir()) {
    fs.unlinkSync(path.join(tmpDir, f));
  }
});
afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const mediaRow = (data: Record<string, unknown>) => ({ id: 'm1', createdAt: new Date(), updatedAt: new Date(), ...data });

describe('POST /api/v1/media/upload', () => {
  it('rejects a request without file', async () => {
    const res = await request(app).post('/api/v1/media/upload').field('personId', 'p1');
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('NO_FILE');
  });

  it('rejects an unknown person and removes the stored file', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'unbekannt')
      .attach('file', png, { filename: 'bild.png', contentType: 'image/png' });

    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('PERSON_NOT_FOUND');
    expect(filesInUploadDir()).toEqual([]);
    expect(prismaMock.media.create).not.toHaveBeenCalled();
  });

  it('stores a photo without touching the profile picture', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ id: 'p1' } as never);
    prismaMock.media.create.mockImplementationOnce((async ({ data }: { data: Record<string, unknown> }) => mediaRow(data)) as never);

    const res = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .field('type', 'PHOTO')
      .attach('file', png, { filename: 'urlaub.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ originalFileName: 'urlaub.png', mimeType: 'image/png', type: 'PHOTO', personId: 'p1' });
    // Stored under a generated name, not under the original name
    expect(filesInUploadDir()).toEqual([res.body.fileName]);
    expect(res.body.fileName).not.toBe('urlaub.png');
    expect(prismaMock.person.update).not.toHaveBeenCalled();
    // The file belongs to the active family tree, the person must be in it
    expect(prismaMock.media.create.mock.calls[0][0].data).toMatchObject({ familyTreeId: 'tree-1' });
    expect(prismaMock.person.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', familyTreeId: 'tree-1' }, select: { isDeleted: true } });
  });

  it('gives no new file to a person in the recycle bin, also not through an event', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ isDeleted: true } as never);
    const direct = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .attach('file', png, { filename: 'bild.png', contentType: 'image/png' });
    expect(direct.status).toBe(409);
    expect(direct.body.reason).toBe('PERSON_IN_TRASH');

    prismaMock.event.findFirst.mockResolvedValueOnce({ personId: 'p1', person: { isDeleted: true } } as never);
    const viaEvent = await request(app)
      .post('/api/v1/media/upload')
      .field('eventId', 'e1')
      .attach('file', png, { filename: 'karte.png', contentType: 'image/png' });
    expect(viaEvent.status).toBe(409);
    expect(viaEvent.body.reason).toBe('PERSON_IN_TRASH');

    expect(filesInUploadDir()).toEqual([]);
    expect(prismaMock.media.create).not.toHaveBeenCalled();
  });

  it('locks the family tree and checks the person again in the transaction', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ isDeleted: false } as never).mockResolvedValueOnce(null);
    const trashed = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .attach('file', png, { filename: 'bild.png', contentType: 'image/png' });
    // Moved to the recycle bin (or deleted) while the file arrived
    expect(trashed.status).toBe(409);
    expect(trashed.body.reason).toBe('PERSON_IN_TRASH');
    expect(prismaMock.familyTree.updateMany).toHaveBeenCalledWith({ where: { id: 'tree-1', isDeleted: false }, data: { isDeleted: false } });
    expect(prismaMock.person.findFirst).toHaveBeenLastCalledWith({ where: { id: 'p1', familyTreeId: 'tree-1', isDeleted: false }, select: { id: true } });

    prismaMock.familyTree.updateMany.mockResolvedValueOnce({ count: 0 });
    const treeGone = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .attach('file', png, { filename: 'bild.png', contentType: 'image/png' });
    expect(treeGone.status).toBe(404);
    expect(treeGone.body.reason).toBe('TREE_NOT_FOUND');

    expect(filesInUploadDir()).toEqual([]);
    expect(prismaMock.media.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown family tree and removes the stored file', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('X-Family-Tree-Id', 'weg')
      .field('personId', 'p1')
      .attach('file', png, { filename: 'bild.png', contentType: 'image/png' });

    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('TREE_NOT_FOUND');
    expect(filesInUploadDir()).toEqual([]);
    expect(prismaMock.media.create).not.toHaveBeenCalled();
  });

  it('links a file uploaded for an event and gives it to the person of the event', async () => {
    prismaMock.event.findFirst.mockResolvedValueOnce({ personId: 'p1' } as never);
    prismaMock.media.create.mockImplementationOnce((async ({ data }: { data: Record<string, unknown> }) => mediaRow(data)) as never);

    const res = await request(app).post('/api/v1/media/upload').field('eventId', 'e1').attach('file', png, { filename: 'karte.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(prismaMock.media.create.mock.calls[0][0].data).toMatchObject({ personId: 'p1', events: { create: { eventId: 'e1' } } });
    // The new link counts as a change of the event
    expect(prismaMock.event.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { updatedAt: expect.any(Date) } });
  });

  it('rejects an unknown event and removes the stored file', async () => {
    prismaMock.event.findFirst.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/v1/media/upload')
      .field('eventId', 'weg')
      .attach('file', png, { filename: 'karte.png', contentType: 'image/png' });

    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('EVENT_NOT_FOUND');
    expect(filesInUploadDir()).toEqual([]);
  });

  it('sets an uploaded profile picture on the person', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ id: 'p1' } as never);
    prismaMock.media.create.mockImplementationOnce((async ({ data }: { data: Record<string, unknown> }) => mediaRow(data)) as never);

    const res = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .field('type', 'PROFILE_PICTURE')
      .attach('file', png, { filename: 'portrait.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(prismaMock.person.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { profilePictureId: 'm1' } });
  });

  it('does not use a non-image as profile picture', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ id: 'p1' } as never);
    prismaMock.media.create.mockImplementationOnce((async ({ data }: { data: Record<string, unknown> }) => mediaRow(data)) as never);

    await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .field('type', 'PROFILE_PICTURE')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'urkunde.pdf', contentType: 'application/pdf' });

    expect(prismaMock.person.update).not.toHaveBeenCalled();
  });

  it('refuses an unknown media type and removes the stored file', async () => {
    const res = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .field('type', 'SOMETHING')
      .attach('file', png, { filename: 'bild.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('INVALID_MEDIA_TYPE');
    expect(filesInUploadDir()).toEqual([]);
    expect(prismaMock.media.create).not.toHaveBeenCalled();
  });

  it('answers a file above the limit with 413 and keeps nothing of it', async () => {
    const big = Buffer.alloc(MAX_UPLOAD_MB * 1024 * 1024 + 1);
    const res = await request(app).post('/api/v1/media/upload').field('personId', 'p1').attach('file', big, { filename: 'film.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ reason: 'FILE_TOO_LARGE', params: { limitMb: MAX_UPLOAD_MB } });
    expect(filesInUploadDir()).toEqual([]);
    expect(prismaMock.media.create).not.toHaveBeenCalled();
  });

  it('writes medium, link and profile picture in one transaction', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ id: 'p1' } as never);
    prismaMock.media.create.mockImplementationOnce((async ({ data }: { data: Record<string, unknown> }) => mediaRow(data)) as never);
    prismaMock.person.update.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/v1/media/upload')
      .field('personId', 'p1')
      .field('type', 'PROFILE_PICTURE')
      .attach('file', png, { filename: 'portrait.png', contentType: 'image/png' });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(500);
    expect(filesInUploadDir()).toEqual([]);
  });

  it('cleans up the file if the database write fails', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ id: 'p1' } as never);
    prismaMock.media.create.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).post('/api/v1/media/upload').field('personId', 'p1').attach('file', png, { filename: 'bild.png', contentType: 'image/png' });

    expect(res.status).toBe(500);
    expect(res.body.reason).toBe('UPLOAD_FAILED');
    expect(filesInUploadDir()).toEqual([]);
  });
});

describe('GET /api/v1/media/:id/download', () => {
  it('sends the file as attachment under its original name', async () => {
    fs.writeFileSync(path.join(tmpDir, 'abc.png'), png);
    prismaMock.media.findFirst.mockResolvedValueOnce({ fileName: 'abc.png', originalFileName: 'Hochzeit Łódź.png' } as never);

    const res = await request(app).get('/api/v1/media/m1/download?familyTree=tree-1');

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    // Letters outside of Latin-1 survive in the encoded form of the name
    const encoded = /filename\*=UTF-8''(\S+)/.exec(res.headers['content-disposition'])?.[1] ?? '';
    expect(decodeURIComponent(encoded)).toBe('Hochzeit Łódź.png');
    expect(Buffer.from(res.body).equals(png)).toBe(true);
    // Only media of the requested family tree
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tree-1', isDeleted: false } }));
    expect(prismaMock.media.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'm1', familyTreeId: 'tree-1' } }));
  });

  it('answers a medium of another family tree with 404', async () => {
    prismaMock.media.findFirst.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/media/fremd/download');
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('MEDIA_NOT_FOUND');
  });

  it('answers a missing file with 404', async () => {
    prismaMock.media.findFirst.mockResolvedValueOnce({ fileName: 'weg.png', originalFileName: 'weg.png' } as never);
    const res = await request(app).get('/api/v1/media/m1/download');
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('MEDIA_NOT_FOUND');
  });

  it('answers an unknown family tree with 404', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/media/m1/download?familyTree=weg');
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('TREE_NOT_FOUND');
    expect(prismaMock.media.findFirst).not.toHaveBeenCalled();
  });
});
