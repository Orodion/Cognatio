import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { connectionUrl, ensurePassword, freePort, pgDirPath, rotateServerLog, startBundledPostgres } from '../bundledPostgres.js';
import type { Run } from '../run.js';

const log = { info: jest.fn(), warn: jest.fn() };
let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-pg-test-'));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

/** Fake PostgreSQL folder: only the file whose existence is checked */
function fakePgDir() {
  const dir = path.join(tmp, 'pg');
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'bin', process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'), '');
  return dir;
}

type Call = { tool: string; args: string[]; quiet?: boolean };

/** Records the calls; `initdb` creates PG_VERSION like the real one, `status` answers as configured */
function fakeRun(options: { running?: boolean; failOn?: string } = {}) {
  const calls: Call[] = [];
  const run: Run = async (file, args, _env, quiet) => {
    const tool = path.basename(file).replace(/\.exe$/, '');
    const verb = tool === 'pg_ctl' ? `pg_ctl ${args[0]}` : tool;
    calls.push({ tool: verb, args, quiet });
    if (tool === 'initdb') {
      const pgdata = args[args.indexOf('-D') + 1];
      fs.mkdirSync(pgdata, { recursive: true });
      fs.writeFileSync(path.join(pgdata, 'PG_VERSION'), '16');
      // the password file exists while initdb runs
      const pwfile = args.find((a) => a.startsWith('--pwfile='))!.slice('--pwfile='.length);
      calls[calls.length - 1].args = [...args, `pw:${fs.readFileSync(pwfile, 'utf8')}`];
    }
    if (verb === 'pg_ctl --version') {
      return { code: 0, stdout: 'pg_ctl (PostgreSQL) 16.15\n', stderr: '' };
    }
    if (verb === 'pg_ctl status') {
      return { code: options.running ? 0 : 3, stdout: '', stderr: '' };
    }
    if (options.failOn === verb) {
      return { code: 1, stdout: '', stderr: 'boom' };
    }
    return { code: 0, stdout: '', stderr: '' };
  };
  return { run, calls };
}

describe('pgDirPath', () => {
  it('is off without COGNATIO_PG_DIR and absolute otherwise', () => {
    expect(pgDirPath({})).toBeNull();
    expect(pgDirPath({ COGNATIO_PG_DIR: '  ' })).toBeNull();
    expect(pgDirPath({ COGNATIO_PG_DIR: 'tools/postgres' })).toBe(path.resolve('tools/postgres'));
  });
});

describe('ensurePassword', () => {
  it('creates a random password once and keeps other settings in config.json', () => {
    fs.writeFileSync(path.join(tmp, 'config.json'), JSON.stringify({ language: 'de' }));
    const first = ensurePassword(tmp, false);
    expect(first).toMatch(/^[0-9a-f]{48}$/);
    expect(ensurePassword(tmp, true)).toBe(first);
    expect(JSON.parse(fs.readFileSync(path.join(tmp, 'config.json'), 'utf8'))).toEqual({ language: 'de', postgres: { password: first } });
  });

  it('refuses to open an existing database folder without its password', () => {
    expect(() => ensurePassword(tmp, true)).toThrow(/no database password/);
  });
});

describe('freePort and connectionUrl', () => {
  it('returns a usable port and encodes the password in the URL', async () => {
    expect(await freePort()).toBeGreaterThan(1023);
    expect(connectionUrl(5555, 'a/b:c@d')).toBe('postgresql://cognatio:a%2Fb%3Ac%40d@127.0.0.1:5555/cognatio');
  });
});

describe('startBundledPostgres', () => {
  it('creates the cluster on first start, starts on 127.0.0.1 and stops with a fast shutdown', async () => {
    const { run, calls } = fakeRun();
    const dataDir = path.join(tmp, 'Jürgen Müller', 'data');
    const pg = await startBundledPostgres({ pgDir: fakePgDir(), dataDir, log, run });

    const init = calls.find((c) => c.tool === 'initdb')!;
    expect(init.args).toEqual(expect.arrayContaining(['-U', 'cognatio', '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256']));
    expect(init.args).toContain(`pw:${pg.password}`);
    // the password file does not stay behind
    expect(fs.readdirSync(dataDir).filter((f) => f.startsWith('.initdb'))).toEqual([]);

    const start = calls.find((c) => c.tool === 'pg_ctl start')!;
    expect(start.quiet).toBe(true);
    expect(start.args.join(' ')).toContain(`-p ${pg.port} -c listen_addresses=127.0.0.1`);
    expect(pg.url).toBe(connectionUrl(pg.port, pg.password));

    await pg.stop();
    await pg.stop();
    expect(calls.filter((c) => c.tool === 'pg_ctl stop')).toHaveLength(1);
    expect(calls.find((c) => c.tool === 'pg_ctl stop')!.args).toEqual(expect.arrayContaining(['-m', 'fast']));
  });

  it('does not initialise an existing cluster again', async () => {
    const dataDir = path.join(tmp, 'data');
    fs.mkdirSync(path.join(dataDir, 'pgdata'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'pgdata', 'PG_VERSION'), '16');
    fs.writeFileSync(path.join(dataDir, 'config.json'), JSON.stringify({ postgres: { password: 'pw' } }));
    const { run, calls } = fakeRun();
    const pg = await startBundledPostgres({ pgDir: fakePgDir(), dataDir, log, run });
    expect(calls.some((c) => c.tool === 'initdb')).toBe(false);
    expect(pg.password).toBe('pw');
  });

  it('stops a server of an earlier run and removes a stale postmaster.pid', async () => {
    const dataDir = path.join(tmp, 'data');
    fs.mkdirSync(path.join(dataDir, 'pgdata'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'pgdata', 'PG_VERSION'), '16');
    fs.writeFileSync(path.join(dataDir, 'pgdata', 'postmaster.pid'), '123');
    fs.writeFileSync(path.join(dataDir, 'config.json'), JSON.stringify({ postgres: { password: 'pw' } }));
    const { run, calls } = fakeRun({ running: true });
    await startBundledPostgres({ pgDir: fakePgDir(), dataDir, log, run });
    expect(calls.map((c) => c.tool)).toEqual(['pg_ctl --version', 'pg_ctl status', 'pg_ctl stop', 'pg_ctl start']);
    expect(fs.existsSync(path.join(dataDir, 'pgdata', 'postmaster.pid'))).toBe(false);
  });

  it('names the problem if PostgreSQL is missing or does not start', async () => {
    await expect(startBundledPostgres({ pgDir: path.join(tmp, 'nothing'), dataDir: tmp, log })).rejects.toThrow(/PostgreSQL is missing/);
    const { run } = fakeRun({ failOn: 'pg_ctl start' });
    fs.mkdirSync(path.join(tmp, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'logs', 'postgres.log'), 'line 1\nFATAL: could not bind');
    await expect(startBundledPostgres({ pgDir: fakePgDir(), dataDir: tmp, log, run })).rejects.toThrow(/pg_ctl start failed.*could not bind/s);
  });

  it('reports a failing initdb and removes the password file', async () => {
    const { run } = fakeRun({ failOn: 'initdb' });
    await expect(startBundledPostgres({ pgDir: fakePgDir(), dataDir: tmp, log, run })).rejects.toThrow(/initdb failed.*boom/s);
    expect(fs.readdirSync(tmp).filter((f) => f.startsWith('.initdb'))).toEqual([]);
  });
});

describe('rotateServerLog', () => {
  it('leaves a small log alone', () => {
    const file = path.join(tmp, 'postgres.log');
    fs.writeFileSync(file, 'small');
    rotateServerLog(file, 100);
    expect(fs.readFileSync(file, 'utf8')).toBe('small');
    expect(fs.existsSync(`${file}.1`)).toBe(false);
  });

  it('moves a big log up and keeps only the given number of rotated files', () => {
    const file = path.join(tmp, 'postgres.log');
    for (const n of ['a', 'b', 'c']) {
      fs.writeFileSync(file, n.repeat(200));
      rotateServerLog(file, 100, 2);
    }
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.readFileSync(`${file}.1`, 'utf8')).toBe('c'.repeat(200));
    expect(fs.readFileSync(`${file}.2`, 'utf8')).toBe('b'.repeat(200));
    expect(fs.existsSync(`${file}.3`)).toBe(false);
  });
});
