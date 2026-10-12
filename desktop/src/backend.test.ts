import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { BackendStartError, forkWithNode, newPort, newToken, startBackend } from './backend.js';

let dir: string;
const script = (name: string, code: string) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, code);
  return file;
};
const start = (entry: string, extra: { startTimeoutMs?: number; stopTimeoutMs?: number } = {}) => startBackend({ entry, cwd: dir, env: {}, ...extra });

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-desktop-test-'));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('newToken', () => {
  it('is random and long', () => {
    assert.match(newToken(), /^[0-9a-f]{64}$/);
    assert.notEqual(newToken(), newToken());
  });
});

describe('newPort', () => {
  it('lies below the ports for outgoing connections', () => {
    for (let i = 0; i < 100; i++) {
      const port = newPort();
      assert.ok(Number.isInteger(port) && port >= 20_000 && port < 32_000, String(port));
    }
  });
});

describe('startBackend', () => {
  it('passes the settings, reports the port and stops cleanly on a shutdown message', async () => {
    const entry = script(
      'good.cjs',
      `process.send({ type: 'ready', port: 4321, env: { PORT: process.env.PORT, HOST: process.env.HOST, TOKEN: process.env.COGNATIO_ACCESS_TOKEN } });
       process.on('message', (m) => m.type === 'shutdown' && process.exit(0));`,
    );
    const backend = await start(entry);
    assert.equal(backend.port, 4321);
    assert.equal(backend.origin, 'http://127.0.0.1:4321');
    assert.match(backend.token, /^[0-9a-f]{64}$/);
    assert.equal(await backend.stop(), 0);
    assert.equal(await backend.exited, 0);
    // stopping again is harmless and reports the same end
    assert.equal(await backend.stop(), 0);
  });

  it('starts the backend on a free port, only for this machine, with the token', async () => {
    const entry = script(
      'env.cjs',
      `const fs = require('node:fs');
       fs.writeFileSync(process.env.OUT, JSON.stringify({ port: process.env.PORT, fallback: process.env.COGNATIO_PORT_FALLBACK, host: process.env.HOST, token: process.env.COGNATIO_ACCESS_TOKEN, prod: process.env.NODE_ENV }));
       process.send({ type: 'ready', port: 1 });
       process.on('message', () => process.exit(0));`,
    );
    const out = path.join(dir, 'env.json');
    const backend = await startBackend({ entry, cwd: dir, env: { OUT: out } });
    await backend.stop();
    assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), {
      port: '0',
      fallback: '0',
      host: '127.0.0.1',
      token: backend.token,
      prod: 'production',
    });
  });

  it('asks for the given port and allows a free one instead', async () => {
    const entry = script(
      'port.cjs',
      `require('node:fs').writeFileSync(process.env.OUT, JSON.stringify({ port: process.env.PORT, fallback: process.env.COGNATIO_PORT_FALLBACK }));
       process.send({ type: 'ready', port: 23456 });
       process.on('message', () => process.exit(0));`,
    );
    const out = path.join(dir, 'port.json');
    const backend = await startBackend({ entry, cwd: dir, env: { OUT: out }, port: 23456 });
    await backend.stop();
    assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), { port: '23456', fallback: '1' });
  });

  it('rejects if the backend ends before it is ready', async () => {
    await assert.rejects(start(script('dies.cjs', 'process.exit(3);')), /exit code 3/);
  });

  it('hands the error output of a crashed backend to the error', async () => {
    const entry = script('crash.cjs', `require('node:fs').writeSync(2, 'Error: Cannot find module x\\n    at somewhere\\n'); process.exit(1);`);
    const error = await start(entry).catch((e) => e);
    assert.ok(error instanceof BackendStartError);
    assert.match(error.message, /exit code 1/);
    assert.match(error.stderr, /Cannot find module x/);
  });

  it('keeps the error output of a running backend', async () => {
    const entry = script(
      'warn.cjs',
      `require('node:fs').writeSync(2, 'late problem\\n'); process.send({ type: 'ready', port: 1 }); process.on('message', () => process.exit(0));`,
    );
    const backend = await start(entry);
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.match(backend.stderr(), /late problem/);
    await backend.stop();
  });

  it('rejects and kills the backend if it takes too long', async () => {
    await assert.rejects(start(script('slow.cjs', 'setInterval(() => {}, 1000);'), { startTimeoutMs: 500 }), /did not start in time/);
  });

  it('kills a backend that does not shut down in time', async () => {
    const entry = script('stuck.cjs', `process.send({ type: 'ready', port: 1 }); process.on('message', () => {}); setInterval(() => {}, 1000);`);
    const backend = await start(entry, { stopTimeoutMs: 500 });
    // null: killed – the shell then stops the database itself
    assert.equal(await backend.stop(), null);
    assert.equal(await backend.exited, null);
  });

  it('uses the given way of starting the process', async () => {
    const started: string[] = [];
    const entry = script('spawned.cjs', `process.send({ type: 'ready', port: 2 }); process.on('message', () => process.exit(0));`);
    const backend = await startBackend({
      entry,
      cwd: dir,
      env: {},
      spawn: (file, options) => {
        started.push(file);
        return forkWithNode()(file, options);
      },
    });
    assert.deepEqual(started, [entry]);
    assert.equal(await backend.stop(), 0);
  });

  it('reports an unexpected end through `exited`', async () => {
    const entry = script('crash.cjs', `process.send({ type: 'ready', port: 1 }); setTimeout(() => process.exit(7), 200);`);
    const backend = await start(entry);
    assert.equal(await backend.exited, 7);
  });
});
