import http from 'http';
import express from 'express';
import request from 'supertest';
import { oneAtATime } from '../oneAtATime.js';

/** A step the test ends itself: `started` resolves when it runs, `finish` lets it go on */
function controlled() {
  let finish = () => undefined as void;
  let markStarted = () => undefined as void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { started, finished, run: () => (markStarted(), finished), finish: () => finish() };
}

/** Routes behind the same guard */
function guardedApp() {
  const slow = controlled();
  const upload = jest.fn<void, [express.Request, express.Response, express.NextFunction]>((_req, _res, next) => next());
  const app = express();
  app.get(
    '/slow',
    oneAtATime('restore', async (_req, res) => {
      await slow.run();
      res.json({ done: true });
    }),
  );
  app.get(
    '/fast',
    oneAtATime('export', (_req, res) => res.json({ done: true })),
  );
  app.get(
    '/fails',
    oneAtATime('import', () => {
      throw new Error('broken');
    }),
  );
  app.post(
    '/upload',
    oneAtATime('import', (_req, res) => res.json({ done: true }), upload),
  );
  app.post(
    '/upload-fails',
    oneAtATime(
      'import',
      (_req, res) => res.json({ done: true }),
      (_req, _res, next) => next(new Error('too large')),
    ),
  );
  app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) =>
    err.message === 'too large' ? res.status(413).json({ error: err.message }) : next(err),
  );
  return { app, slow, upload };
}

describe('oneAtATime', () => {
  it('answers a second operation with 409 while the first one runs, and lets it through afterwards', async () => {
    const { app, slow } = guardedApp();
    const first = request(app)
      .get('/slow')
      .then((res) => res);
    await slow.started;

    const refused = await request(app).get('/fast');
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ reason: 'OPERATION_IN_PROGRESS', details: ['restore'] });

    slow.finish();
    expect((await first).status).toBe(200);
    expect((await request(app).get('/fast')).status).toBe(200);
  });

  it('is free again after an operation failed', async () => {
    const { app } = guardedApp();
    expect((await request(app).get('/fails')).status).toBe(500);
    expect((await request(app).get('/fast')).status).toBe(200);
  });

  it('stays taken when the client goes away until the work is done', async () => {
    const { app, slow } = guardedApp();
    const server = http.createServer(app).listen(0);
    const { port } = server.address() as { port: number };
    try {
      const gone = http.get({ port, path: '/slow' });
      gone.on('error', () => undefined);
      await slow.started;
      gone.destroy();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The restore is still writing: nobody else may start
      expect((await request(server).get('/fast')).status).toBe(409);
      slow.finish();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect((await request(server).get('/fast')).status).toBe(200);
    } finally {
      server.close();
    }
  });

  it('refuses an upload without keeping it, the client still gets the answer', async () => {
    const { app, slow, upload } = guardedApp();
    const first = request(app)
      .get('/slow')
      .then((res) => res);
    await slow.started;

    const refused = await request(app)
      .post('/upload')
      .attach('file', Buffer.alloc(5 * 1024 * 1024), 'big.zip');
    expect(refused.status).toBe(409);
    expect(upload).not.toHaveBeenCalled();

    slow.finish();
    await first;
    expect((await request(app).post('/upload').attach('file', Buffer.from('x'), 'small.zip')).status).toBe(200);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('passes a failed upload to the error handler and is free again', async () => {
    const { app } = guardedApp();
    const res = await request(app).post('/upload-fails').attach('file', Buffer.from('x'), 'a.zip');
    expect(res.status).toBe(413);
    expect(res.body.error).toBe('too large');
    expect((await request(app).get('/fast')).status).toBe(200);
  });
});
