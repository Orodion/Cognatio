import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDump, dumpDue, listDumps, pruneDumps, restoreDump } from '../safetyBackup.js';
import type { Run } from '../run.js';

const server = { port: 5555, password: 'pw', binDir: path.join('x', 'bin') };
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-dump-test-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const touch = (name: string, ageMs = 0) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, 'x');
  const time = new Date(Date.now() - ageMs);
  fs.utimesSync(file, time, time);
  return file;
};

describe('listDumps, pruneDumps, dumpDue', () => {
  it('lists only safety backups, newest first', () => {
    touch('cognatio-db-20261001-100000-daily.dump');
    touch('cognatio-db-20261002-100000-daily.dump');
    touch('backup.zip');
    expect(listDumps(dir).map((f) => path.basename(f))).toEqual(['cognatio-db-20261002-100000-daily.dump', 'cognatio-db-20261001-100000-daily.dump']);
    expect(listDumps(path.join(dir, 'missing'))).toEqual([]);
  });

  it('keeps the last five', () => {
    for (let day = 1; day <= 8; day++) {
      touch(`cognatio-db-2026100${day}-100000-daily.dump`);
    }
    touch('other.txt');
    const removed = pruneDumps(dir);
    expect(removed).toHaveLength(3);
    expect(listDumps(dir)).toHaveLength(5);
    expect(fs.existsSync(path.join(dir, 'other.txt'))).toBe(true);
  });

  it('is due without a backup or when the newest is a day old', () => {
    expect(dumpDue(dir)).toBe(true);
    touch('cognatio-db-20261001-100000-daily.dump', 60 * 60 * 1000);
    expect(dumpDue(dir)).toBe(false);
    expect(dumpDue(dir, Date.now() + 24 * 60 * 60 * 1000)).toBe(true);
  });
});

describe('createDump', () => {
  it('calls pg_dump with the password in the environment, not in the arguments', async () => {
    const run = jest.fn<ReturnType<Run>, Parameters<Run>>(async (_file, args) => {
      fs.writeFileSync(args[args.indexOf('-f') + 1], 'dump');
      return { code: 0, stdout: '', stderr: '' };
    });
    const file = await createDump(server, path.join(dir, 'db'), 'before-migration', run, new Date('2026-10-09T12:34:56Z'));
    expect(path.basename(file)).toBe('cognatio-db-20261009-123456-before-migration.dump');
    const [tool, args, env] = run.mock.calls[0];
    expect(path.basename(tool)).toMatch(/^pg_dump/);
    expect(args).toEqual(expect.arrayContaining(['-Fc', '-h', '127.0.0.1', '-p', '5555', '-U', 'cognatio', 'cognatio']));
    expect(args.join(' ')).not.toContain('pw');
    expect(env).toEqual({ PGPASSWORD: 'pw' });
  });

  it('deletes a half-written file and reports the error', async () => {
    const run: Run = async (_file, args) => {
      fs.writeFileSync(args[args.indexOf('-f') + 1], 'half');
      return { code: 1, stdout: '', stderr: 'no connection' };
    };
    await expect(createDump(server, dir, 'daily', run)).rejects.toThrow(/pg_dump failed.*no connection/);
    expect(listDumps(dir)).toEqual([]);
  });

  it('prunes old backups after a new one', async () => {
    for (let day = 1; day <= 5; day++) {
      touch(`cognatio-db-2026100${day}-100000-daily.dump`);
    }
    const run: Run = async (_file, args) => {
      fs.writeFileSync(args[args.indexOf('-f') + 1], 'dump');
      return { code: 0, stdout: '', stderr: '' };
    };
    await createDump(server, dir, 'daily', run, new Date('2026-10-09T10:00:00Z'));
    expect(listDumps(dir)).toHaveLength(5);
    expect(path.basename(listDumps(dir)[0])).toContain('20261009');
  });
});

describe('restoreDump', () => {
  it('replaces the objects of the database and reports errors', async () => {
    const run = jest.fn<ReturnType<Run>, Parameters<Run>>(async () => ({ code: 0, stdout: '', stderr: '' }));
    await restoreDump(server, 'a.dump', run);
    expect(run.mock.calls[0][1]).toEqual(expect.arrayContaining(['--clean', '--if-exists', '-d', 'cognatio', 'a.dump']));
    await expect(restoreDump(server, 'a.dump', async () => ({ code: 1, stdout: '', stderr: 'bad' }))).rejects.toThrow(/pg_restore failed.*bad/);
  });
});
