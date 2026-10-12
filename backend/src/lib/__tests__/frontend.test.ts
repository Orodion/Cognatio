import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { frontendDir, serveFrontend } from '../frontend.js';

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-web-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>app</html>');
  fs.writeFileSync(path.join(dir, 'favicon.svg'), '<svg/>');
  fs.writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function app() {
  const app = express();
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(serveFrontend(dir));
  return app;
}

describe('serveFrontend', () => {
  it('serves index.html at / and for client-side routes, never cached', async () => {
    for (const url of ['/', '/persons/42']) {
      const res = await request(app()).get(url).set('Accept', 'text/html').expect(200);
      expect(res.text).toBe('<html>app</html>');
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    }
  });

  it('caches hashed files for a year and other files not at all', async () => {
    const asset = await request(app()).get('/assets/index-abc123.js').expect(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const icon = await request(app()).get('/favicon.svg').expect(200);
    expect(icon.headers['cache-control']).toBe('no-cache');
  });

  it('answers unknown files and backend paths with 404 instead of the web page', async () => {
    await request(app()).get('/assets/missing.js').set('Accept', 'text/html').expect(404);
    await request(app()).get('/api/v1/unknown').set('Accept', 'text/html').expect(404);
    await request(app()).get('/graphql').set('Accept', 'text/html').expect(404);
    await request(app()).get('/uploads/a.jpg').set('Accept', 'text/html').expect(404);
    await request(app()).get('/persons/42').set('Accept', 'application/json').expect(404);
  });

  it('does not touch the API routes registered before it', async () => {
    await request(app()).get('/api/v1/health').expect(200);
  });
});

describe('frontendDir', () => {
  it('is off without FRONTEND_DIR', () => {
    expect(frontendDir({})).toBeNull();
    expect(frontendDir({ FRONTEND_DIR: '  ' })).toBeNull();
  });

  it('returns the absolute folder and rejects one without a build', () => {
    expect(frontendDir({ FRONTEND_DIR: dir })).toBe(path.resolve(dir));
    expect(() => frontendDir({ FRONTEND_DIR: os.tmpdir() })).toThrow(/index\.html/);
  });
});
