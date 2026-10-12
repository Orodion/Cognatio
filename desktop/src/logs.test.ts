import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { errorSummary, lastError, logSize } from './logs.js';
import { splashPage, texts } from './texts.js';

let dir: string;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-desktop-log-'));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const line = (o: object) => JSON.stringify(o) + '\n';

describe('lastError', () => {
  it('returns the last error entry with its message', () => {
    const file = path.join(dir, 'a.log');
    fs.writeFileSync(
      file,
      line({ level: 'error', msg: 'old' }) +
        line({ level: 'error', msg: 'Server could not be started', err: { message: 'Migration 2_x failed: boom' } }) +
        line({ level: 'info', msg: 'Database server stopped' }) +
        'not json\n',
    );
    assert.equal(lastError(file), 'Server could not be started: Migration 2_x failed: boom');
  });

  it('is null without a log or without an error', () => {
    assert.equal(lastError(path.join(dir, 'missing.log')), null);
    const file = path.join(dir, 'b.log');
    fs.writeFileSync(file, line({ level: 'info', msg: 'fine' }));
    assert.equal(lastError(file), null);
  });

  it('reads only the end of a large file and skips the cut first line', () => {
    const file = path.join(dir, 'c.log');
    fs.writeFileSync(file, line({ level: 'error', msg: 'too old' }) + line({ level: 'info', msg: 'x'.repeat(2000) }));
    assert.equal(lastError(file, 500), null);
  });
});

describe('lastError since a position', () => {
  it('ignores entries of earlier runs', () => {
    const file = path.join(dir, 'd.log');
    fs.writeFileSync(file, line({ level: 'error', msg: 'earlier run' }));
    const start = logSize(file);
    assert.equal(lastError(file, undefined, start), null);
    fs.appendFileSync(file, line({ level: 'error', msg: 'this run' }));
    assert.equal(lastError(file, undefined, start), 'this run');
  });

  it('reads everything if the file became smaller (rotated)', () => {
    const file = path.join(dir, 'e.log');
    fs.writeFileSync(file, line({ level: 'error', msg: 'after rotation' }));
    assert.equal(lastError(file, undefined, 100000), 'after rotation');
    assert.equal(logSize(path.join(dir, 'none.log')), 0);
  });
});

describe('errorSummary', () => {
  it('picks the line that names the error, not the stack frames', () => {
    const stderr = 'node:internal\nError: Cannot find module x\n    at Module._resolve (a.js:1:1)\n    at run (b.js:2:2)\n';
    assert.equal(errorSummary(stderr), 'Error: Cannot find module x');
  });

  it('shows a log entry of the backend like the log does', () => {
    const stderr =
      line({ level: 'info', msg: 'Starting' }) + line({ level: 'error', msg: 'Server could not be started', err: { message: 'ENOTDIR: not a directory' } });
    assert.equal(errorSummary(stderr), 'Server could not be started: ENOTDIR: not a directory');
  });

  it('falls back to the last line, shortens it and is null without output', () => {
    assert.equal(errorSummary('first\nlast line\n'), 'last line');
    assert.equal(errorSummary('x'.repeat(500))?.length, 300);
    assert.equal(errorSummary('  \n'), null);
  });
});

describe('texts', () => {
  it('follows the language of the system, English for languages the app does not have', () => {
    assert.equal(texts('de-DE').restart, 'Neu starten');
    assert.equal(texts('fr').restart, 'Redémarrer');
    assert.equal(texts('ja-JP').restart, 'Restart');
  });

  it('builds a splash page that escapes the message', () => {
    const page = decodeURIComponent(splashPage('<b>"x"</b>').replace('data:text/html;charset=utf-8,', ''));
    assert.ok(page.includes('&lt;b&gt;&quot;x&quot;&lt;/b&gt;'));
    assert.ok(!page.includes('<b>'));
  });
});
