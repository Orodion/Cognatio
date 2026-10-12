import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { strFromU8, unzipSync } from 'fflate';
import { logger } from '../../lib/logger.js';
import logRoutes from '../logRoutes.js';

const app = express();
app.use('/api/v1', logRoutes);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-log-routes-'));
const file = path.join(dir, 'cognatio.log');
const entries = Array.from({ length: 8 }, (_, i) => JSON.stringify({ time: '2026-09-30T10:00:00.000Z', level: 'info', msg: `entry ${i}` }));

beforeEach(() => {
  fs.writeFileSync(file, entries.join('\n') + '\n');
  jest.spyOn(logger, 'file', 'get').mockReturnValue(file);
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const binary = (res: request.Response, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('GET /api/v1/logs', () => {
  it('returns the newest lines with the file name (not the path) and the level', async () => {
    const res = await request(app).get('/api/v1/logs?lines=3').expect(200);
    expect(res.body.file).toBe('cognatio.log');
    expect(res.body.level).toBe(logger.level);
    expect(res.body.lines.map((l: string) => JSON.parse(l).msg)).toEqual(['entry 5', 'entry 6', 'entry 7']);
    expect(JSON.stringify(res.body)).not.toContain(dir);
  });

  it('uses a default and an upper limit for the number of lines and ignores nonsense', async () => {
    expect((await request(app).get('/api/v1/logs')).body.lines).toHaveLength(8);
    expect((await request(app).get('/api/v1/logs?lines=abc')).body.lines).toHaveLength(8);
    expect((await request(app).get('/api/v1/logs?lines=-5')).body.lines).toHaveLength(8);
    expect((await request(app).get('/api/v1/logs?lines=99999999')).body.lines).toHaveLength(8);
  });

  it('reports no file and no lines if the server writes no log file', async () => {
    jest.spyOn(logger, 'file', 'get').mockReturnValue(null);
    const res = await request(app).get('/api/v1/logs').expect(200);
    expect(res.body).toMatchObject({ file: null, lines: [] });
  });
});

describe('DELETE /api/v1/logs', () => {
  it('deletes the log files', async () => {
    const clear = jest.spyOn(logger, 'clearFiles').mockImplementation(() => undefined);
    const res = await request(app).delete('/api/v1/logs').expect(200);
    expect(res.body).toEqual({ cleared: true });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('reports a failure', async () => {
    jest.spyOn(logger, 'clearFiles').mockImplementation(() => {
      throw new Error('EBUSY');
    });
    const res = await request(app).delete('/api/v1/logs').expect(500);
    expect(res.body.reason).toBe('LOG_CLEAR_FAILED');
  });
});

describe('GET /api/v1/logs/export', () => {
  it('downloads a ZIP with the log files and a technical description', async () => {
    const res = await request(app).get('/api/v1/logs/export').buffer(true).parse(binary).expect(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="cognatio_logs_\d{8}_\d{6}\.zip"/);
    const zip = unzipSync(new Uint8Array(res.body as Buffer));
    expect(strFromU8(zip['backend/cognatio.log'])).toContain('entry 7');
    expect(JSON.parse(strFromU8(zip['system.json'])).logFile).toBe('cognatio.log');
  });
});
