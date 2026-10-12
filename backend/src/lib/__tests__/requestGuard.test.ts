import express from 'express';
import request from 'supertest';
import { allowedHosts, hostAllowed, hostCheck, hostName, sameOriginWrites } from '../requestGuard.js';

function app(options: { hosts?: string[]; origins?: string[] } = {}) {
  const app = express();
  app.use(hostCheck(options.hosts ?? []));
  app.use(sameOriginWrites(options.origins ?? []));
  app.get('/api/v1/data', (_req, res) => res.json({ ok: true }));
  app.post('/api/v1/backup/restore', (_req, res) => res.json({ restored: true }));
  return app;
}

describe('hostName', () => {
  it('drops the port, brackets and a trailing dot', () => {
    expect(hostName('127.0.0.1:4000')).toBe('127.0.0.1');
    expect(hostName('[::1]:4000')).toBe('::1');
    expect(hostName('LocalHost.:3000')).toBe('localhost');
    expect(hostName('cognatio.example')).toBe('cognatio.example');
    expect(hostName('')).toBeNull();
    expect(hostName(undefined)).toBeNull();
    expect(hostName('[]')).toBeNull();
  });
});

describe('hostAllowed', () => {
  it('allows IP addresses, localhost and the configured names', () => {
    expect(hostAllowed('127.0.0.1')).toBe(true);
    expect(hostAllowed('192.168.1.20')).toBe(true);
    expect(hostAllowed('::1')).toBe(true);
    expect(hostAllowed('localhost')).toBe(true);
    expect(hostAllowed('app.localhost')).toBe(true);
    expect(hostAllowed('stammbaum.example', ['stammbaum.example'])).toBe(true);
  });

  it('refuses other names (DNS rebinding) and a missing host', () => {
    expect(hostAllowed('attacker.example')).toBe(false);
    expect(hostAllowed('127.0.0.1.nip.io')).toBe(false);
    expect(hostAllowed('localhost.attacker.example')).toBe(false);
    expect(hostAllowed(null)).toBe(false);
  });

  it('reads further names from ALLOWED_HOSTS', () => {
    expect(allowedHosts(' Stammbaum.example , other.example:8080 ,')).toEqual(['stammbaum.example', 'other.example']);
    expect(allowedHosts(undefined)).toEqual([]);
  });
});

describe('hostCheck', () => {
  it('answers requests to its own address', async () => {
    await request(app()).get('/api/v1/data').set('Host', 'localhost:4000').expect(200);
    await request(app()).get('/api/v1/data').set('Host', '127.0.0.1:4000').expect(200);
    await request(app({ hosts: ['stammbaum.example'] }))
      .get('/api/v1/data')
      .set('Host', 'stammbaum.example')
      .expect(200);
  });

  it('refuses a foreign name in the Host header', async () => {
    const res = await request(app()).get('/api/v1/data').set('Host', 'attacker.example:4000').expect(403);
    expect(res.body.reason).toBe('HOST_NOT_ALLOWED');
  });
});

describe('sameOriginWrites', () => {
  const restore = (headers: Record<string, string>, options?: { origins?: string[] }) => {
    const req = request(app(options)).post('/api/v1/backup/restore').set('Host', '127.0.0.1:4000');
    for (const [name, value] of Object.entries(headers)) {
      req.set(name, value);
    }
    return req;
  };

  it('lets changes of the own page and of programs through', async () => {
    await restore({ 'Sec-Fetch-Site': 'same-origin', Origin: 'http://127.0.0.1:4000' }).expect(200);
    // Vite dev proxy: the browser sees one origin, the backend another Host
    await restore({ 'Sec-Fetch-Site': 'same-origin', Origin: 'http://localhost:3000' }).expect(200);
    // Older browser without Sec-Fetch-Site, same address
    await restore({ Origin: 'http://127.0.0.1:4000' }).expect(200);
    // Scripts and tests send neither header
    await restore({}).expect(200);
  });

  it('refuses changes sent by another website', async () => {
    const res = await restore({ 'Sec-Fetch-Site': 'cross-site', Origin: 'https://attacker.example' }).expect(403);
    expect(res.body.reason).toBe('CROSS_SITE_REQUEST');
    await restore({ 'Sec-Fetch-Site': 'same-site', Origin: 'http://localhost:5173' }).expect(403);
    await restore({ Origin: 'https://attacker.example' }).expect(403);
    await restore({ Origin: 'null' }).expect(403);
  });

  it('allows origins from CORS_ORIGINS and reading from anywhere', async () => {
    await restore({ 'Sec-Fetch-Site': 'cross-site', Origin: 'https://studio.apollographql.com' }, { origins: ['https://studio.apollographql.com'] }).expect(
      200,
    );
    await request(app()).get('/api/v1/data').set('Sec-Fetch-Site', 'cross-site').expect(200);
  });
});
