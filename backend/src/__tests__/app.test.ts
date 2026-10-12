import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import type { Express } from 'express';
import { prismaMock } from '../test/prismaMock.js';

// Write the log to a temporary file so the entries can be checked
const mockLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-applog-'));
const mockLogFile = path.join(mockLogDir, 'app.log');
jest.mock('../lib/logger.js', () => {
  const actual = jest.requireActual('../lib/logger.js');
  return {
    ...actual,
    logger: new actual.Logger({ level: 'debug', console: 'off', file: mockLogFile, maxFileBytes: 1e9, keepFiles: 0 }),
  };
});
jest.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
jest.mock('../lib/files/uploads.js', () => ({ uploadDir: mockLogDir, removeUploadedFile: jest.fn(), ensureUploadDir: jest.fn(), removeTempFile: jest.fn() }));

import { allowedOrigins, createApp } from '../app.js';

let app: Express;
beforeAll(async () => {
  app = await createApp();
});
// The log file stays open – each test only evaluates the newly added lines
let offset = 0;
const readLog = () => (fs.existsSync(mockLogFile) ? fs.readFileSync(mockLogFile, 'utf8') : '');
beforeEach(() => {
  offset = readLog().length;
  // Without a header every request works in the oldest family tree
  prismaMock.familyTree.findFirst.mockResolvedValue({ id: 'tree-1' } as never);
});
afterAll(() => fs.rmSync(mockLogDir, { recursive: true, force: true }));

type Entry = Record<string, unknown>;
const entries = (): Entry[] =>
  readLog()
    .slice(offset)
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Entry);
// The access log is written on "finish" – shortly after the response
const settle = () => new Promise((resolve) => setImmediate(resolve));

const graphql = (query: string, variables?: Record<string, unknown>, operationName?: string) =>
  request(app).post('/graphql').set('Content-Type', 'application/json').send({ query, variables, operationName });

describe('health check', () => {
  it('reports the application and database as available', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }] as never);
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });

    await settle();
    // Routine queries are logged at DEBUG only
    expect(entries()).toEqual([expect.objectContaining({ level: 'debug', component: 'http', method: 'GET', url: '/api/v1/health', status: 200 })]);
  });

  it('answers 503 and logs the cause if the database is unreachable', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', database: 'unreachable' });

    await settle();
    const [cause, access] = entries();
    expect(cause).toMatchObject({ level: 'error', msg: 'Health check: database unreachable', err: { message: 'connect ECONNREFUSED' } });
    expect(access).toMatchObject({ level: 'error', status: 503 });
  });
});

describe('access log', () => {
  it('logs queries on DEBUG and mutations on INFO, without variables', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    await graphql('query GetPersons { getPersons { id } }', undefined, 'GetPersons').expect(200);
    prismaMock.person.findFirst.mockResolvedValueOnce({ id: 'p1', isDeleted: false } as never);
    prismaMock.person.update.mockResolvedValueOnce({ id: 'p1' } as never);
    await graphql('mutation DeletePerson($id: ID!) { deletePerson(id: $id) }', { id: 'geheim-p1' }, 'DeletePerson');

    await settle();
    const access = entries().filter((e) => e.component === 'http');
    expect(access).toEqual([
      expect.objectContaining({ level: 'debug', operation: 'GetPersons', operationType: 'query', status: 200 }),
      expect.objectContaining({ level: 'info', operation: 'DeletePerson', operationType: 'mutation' }),
    ]);
    expect(typeof access[0].durationMs).toBe('number');
    expect(JSON.stringify(entries())).not.toContain('geheim-p1');
  });

  it('logs client errors as warnings', async () => {
    const res = await request(app).post('/graphql').set('Content-Type', 'application/json').send('{kaputt');
    expect(res.status).toBe(400);
    await request(app).get('/api/v1/gibt-es-nicht').expect(404);

    await settle();
    expect(entries().map((e) => [e.level, e.status])).toEqual([
      ['warn', 400],
      ['warn', 400],
      ['warn', 404],
    ]);
  });
});

describe('family tree of a request', () => {
  it('works in the family tree from the header and rejects unknown ones', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce({ id: 'tree-2' } as never);
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    await graphql('{ getPersons { id } }').set('X-Family-Tree-Id', 'tree-2').expect(200);
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tree-2', isDeleted: false } }));
    expect(prismaMock.person.findMany.mock.calls[0][0]?.where).toMatchObject({ familyTreeId: 'tree-2' });

    prismaMock.familyTree.findFirst.mockResolvedValueOnce(null);
    const res = await graphql('{ getPersons { id } }').set('X-Family-Tree-Id', 'weg');
    expect(res.body.errors[0].extensions.reason).toBe('TREE_NOT_FOUND');
  });

  it('uses the oldest family tree without header', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    await graphql('{ getPersons { id } }').expect(200);
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledWith({ where: { isDeleted: false }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    expect(prismaMock.person.findMany.mock.calls[0][0]?.where).toMatchObject({ familyTreeId: 'tree-1' });
  });
});

describe('GraphQL errors', () => {
  it('logs deliberate errors as warnings with code and path', async () => {
    prismaMock.media.findFirst.mockResolvedValueOnce(null);
    const res = await graphql('mutation DeleteMedia { deleteMedia(id: "m1") }', undefined, 'DeleteMedia');
    expect(res.body.errors[0].extensions.reason).toBe('MEDIA_NOT_FOUND');

    await settle();
    expect(entries().filter((e) => e.component === 'graphql')).toEqual([
      expect.objectContaining({ level: 'warn', operation: 'DeleteMedia', path: 'deleteMedia', code: 'NOT_FOUND', reason: 'MEDIA_NOT_FOUND' }),
    ]);
  });

  it('logs unexpected errors with stack trace', async () => {
    prismaMock.person.findMany.mockRejectedValueOnce(new Error('DB down'));
    await graphql('query GetPersons { getPersons { id } }', undefined, 'GetPersons');

    await settle();
    const [error] = entries().filter((e) => e.component === 'graphql');
    expect(error).toMatchObject({ level: 'error', operation: 'GetPersons', path: 'getPersons', err: { message: 'DB down' } });
    expect((error.err as Entry).stack).toContain('DB down');
  });
});

describe('security headers', () => {
  it('sets protective headers and a strict content security policy for API responses and uploads', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([] as never);
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");

    fs.writeFileSync(path.join(mockLogDir, 'boese.html'), '<script>alert(1)</script>');
    const upload = await request(app).get('/uploads/boese.html');
    // Scripts in uploaded files are not executed (no script-src, falls back to default-src 'none')
    expect(upload.headers['content-security-policy']).toBe(
      "default-src 'none';img-src 'self' data:;media-src 'self';object-src 'self';style-src 'unsafe-inline';frame-ancestors 'self'",
    );
  });

  it('sends uploads that could run code as downloads and shows images, PDFs and media', async () => {
    for (const name of ['seite.html', 'bild.svg', 'verlauf.gpx', 'daten.zip', 'OHNE_ENDUNG']) {
      fs.writeFileSync(path.join(mockLogDir, name), 'x');
      const res = await request(app).get(`/uploads/${name}`);
      expect(res.headers['content-disposition']).toBe('attachment');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    }
    for (const name of ['foto.PNG', 'urkunde.pdf', 'film.mp4', 'ton.mp3']) {
      fs.writeFileSync(path.join(mockLogDir, name), 'x');
      const res = await request(app).get(`/uploads/${name}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toBeUndefined();
    }
  });

  it('keeps GraphQL free of the strict policy (Apollo Sandbox in development)', async () => {
    const res = await request(app).get('/graphql').set('Accept', 'text/html');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('does not allow other websites to call the API', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    const res = await graphql('{ getPersons { id } }').set('Origin', 'https://boese.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reads additional allowed origins from CORS_ORIGINS', () => {
    expect(allowedOrigins(undefined)).toEqual([]);
    expect(allowedOrigins(' https://studio.apollographql.com , http://nas:8080,')).toEqual(['https://studio.apollographql.com', 'http://nas:8080']);
  });
});
