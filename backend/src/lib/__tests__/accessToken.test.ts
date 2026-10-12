import express from 'express';
import request from 'supertest';
import { accessToken, cookieValue } from '../accessToken.js';

function app(token?: string) {
  const app = express();
  app.use(accessToken(token));
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/v1/data', (_req, res) => res.json({ secret: true }));
  return app;
}

describe('accessToken', () => {
  it('checks nothing without a token (development)', async () => {
    await request(app(undefined)).get('/api/v1/data').expect(200);
    await request(app('  ')).get('/api/v1/data').expect(200);
  });

  it('refuses requests without or with a wrong token', async () => {
    const res = await request(app('s3cret')).get('/api/v1/data').expect(401);
    expect(res.body).toEqual({ error: expect.any(String), reason: 'UNAUTHORIZED' });
    await request(app('s3cret')).get('/api/v1/data').set('X-Cognatio-Token', 's3cre').expect(401);
    await request(app('s3cret')).get('/api/v1/data').set('Cookie', 'cognatio_token=wrong').expect(401);
  });

  it('accepts the token in the header or in the cookie', async () => {
    await request(app('s3cret')).get('/api/v1/data').set('X-Cognatio-Token', 's3cret').expect(200);
    await request(app('s3cret')).get('/api/v1/data').set('Cookie', 'theme=dark; cognatio_token=s3cret').expect(200);
  });

  it('leaves the health check open', async () => {
    await request(app('s3cret')).get('/api/v1/health').expect(200);
  });
});

describe('cookieValue', () => {
  it('reads one cookie and decodes it', () => {
    expect(cookieValue('a=1; b=x%3Dy; c=3', 'b')).toBe('x=y');
    expect(cookieValue('a=1', 'b')).toBeNull();
    expect(cookieValue(undefined, 'b')).toBeNull();
    expect(cookieValue('b=%E0%A4%A', 'b')).toBeNull();
  });
});
