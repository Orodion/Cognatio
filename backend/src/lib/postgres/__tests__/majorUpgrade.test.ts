import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { binMajor, clusterMajor, oldServerDir, pruneOldClusters, upgradeIfNeeded, type UpgradeOptions } from '../majorUpgrade.js';
import type { Run } from '../run.js';

const log = { info: jest.fn(), warn: jest.fn() };
let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-upgrade-test-'));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const pgCtl = process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl';

/** Fake PostgreSQL folder: only pg_ctl, whose existence is checked */
function fakeServer(dir: string) {
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'bin', pgCtl), '');
  return dir;
}

/** A database folder of the given major version with one data file */
function cluster(folder: string, major: number, content = 'old data') {
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'PG_VERSION'), `${major}\n`);
  fs.writeFileSync(path.join(folder, 'data'), content);
}

/**
 * Records the calls as "<old|new> <tool>"; pg_dump writes the dump file, pg_restore puts its content into the new
 * cluster (so the test sees that the data went across), `failOn` lets one call fail.
 */
function fakeRun(oldDir: string, options: { newMajor?: number; failOn?: string; running?: boolean } = {}) {
  const calls: string[] = [];
  const clusters = new Map<number, string>();
  const run: Run = async (file, args) => {
    const tool = path.basename(file).replace(/\.exe$/, '');
    const verb = tool === 'pg_ctl' ? `pg_ctl ${args[0]}` : tool;
    const call = `${file.startsWith(oldDir) ? 'old' : 'new'} ${verb}`;
    calls.push(call);
    if (options.failOn === call) {
      return { code: 1, stdout: '', stderr: 'boom' };
    }
    if (verb === 'pg_ctl --version') {
      return { code: 0, stdout: `pg_ctl (PostgreSQL) ${options.newMajor ?? 18}.1\n`, stderr: '' };
    }
    if (verb === 'pg_ctl status') {
      return { code: options.running ? 0 : 3, stdout: '', stderr: '' };
    }
    if (verb === 'pg_ctl start') {
      const port = Number(/-p (\d+)/.exec(args[args.indexOf('-o') + 1])![1]);
      clusters.set(port, args[args.indexOf('-D') + 1]);
    }
    const portOf = () => Number(args[args.indexOf('-p') + 1]);
    if (tool === 'pg_dump') {
      fs.writeFileSync(args[args.indexOf('-f') + 1], fs.readFileSync(path.join(clusters.get(portOf())!, 'data')));
    }
    if (tool === 'pg_restore') {
      fs.writeFileSync(path.join(clusters.get(portOf())!, 'data'), fs.readFileSync(args[args.length - 1]));
    }
    return { code: 0, stdout: '', stderr: '' };
  };
  return { run, calls };
}

function setup(options: Parameters<typeof fakeRun>[1] = {}) {
  const pgDir = fakeServer(path.join(tmp, 'postgres'));
  const oldDir = fakeServer(oldServerDir(pgDir, 16));
  const dataDir = path.join(tmp, 'Jürgen Müller', 'data');
  const pgdata = path.join(dataDir, 'pgdata');
  const { run, calls } = fakeRun(oldDir, options);
  let port = 6000;
  const upgrade: UpgradeOptions = {
    pgDir,
    pgdata,
    password: 'pw',
    dumpDir: path.join(dataDir, 'backups', 'db'),
    serverLog: path.join(dataDir, 'logs', 'postgres.log'),
    log,
    port: async () => ++port,
    initCluster: async (folder) => cluster(folder, options.newMajor ?? 18, 'empty'),
    run,
    now: () => new Date('2026-10-12T10:00:00Z'),
  };
  return { pgDir, dataDir, pgdata, calls, upgrade };
}

describe('clusterMajor and binMajor', () => {
  it('reads the version of the database folder and of the programs', async () => {
    expect(clusterMajor(path.join(tmp, 'none'))).toBeNull();
    cluster(path.join(tmp, 'c'), 16);
    expect(clusterMajor(path.join(tmp, 'c'))).toBe(16);
    const { run } = fakeRun('/nowhere', { newMajor: 17 });
    expect(await binMajor('/pg/bin', run)).toBe(17);
    const failing: Run = async () => ({ code: 1, stdout: '', stderr: 'not found' });
    await expect(binMajor('/pg/bin', failing)).rejects.toThrow(/could not be determined: not found/);
  });
});

describe('upgradeIfNeeded', () => {
  it('does nothing for a new installation or the same major version', async () => {
    const { pgdata, calls, upgrade } = setup({ newMajor: 16 });
    expect(await upgradeIfNeeded(upgrade)).toBeNull();
    expect(calls).toEqual([]);
    cluster(pgdata, 16);
    expect(await upgradeIfNeeded(upgrade)).toBeNull();
    expect(calls).toEqual(['new pg_ctl --version']);
  });

  it('converts the data with the old server, the current pg_dump and a new cluster, and keeps the old folder', async () => {
    const { dataDir, pgdata, calls, upgrade } = setup();
    cluster(pgdata, 16, 'family data');
    fs.writeFileSync(path.join(pgdata, 'postmaster.pid'), '123');

    expect(await upgradeIfNeeded(upgrade)).toBe(16);
    expect(calls).toEqual([
      'new pg_ctl --version',
      'old pg_ctl status',
      'old pg_ctl start',
      'new pg_dump',
      'old pg_ctl stop',
      'new pg_ctl start',
      'new pg_restore',
      'new pg_ctl stop',
    ]);
    expect(clusterMajor(pgdata)).toBe(18);
    expect(fs.readFileSync(path.join(pgdata, 'data'), 'utf8')).toBe('family data');
    const old = path.join(dataDir, 'pgdata-16.old');
    expect(clusterMajor(old)).toBe(16);
    expect(fs.existsSync(path.join(old, 'postmaster.pid'))).toBe(false);
    expect(fs.readdirSync(path.join(dataDir, 'backups', 'db'))).toEqual(['cognatio-db-20261012-100000-before-postgres-18.dump']);
    expect(fs.readdirSync(dataDir).sort()).toEqual(['backups', 'pgdata', 'pgdata-16.old']);
  });

  it('stops an old server that is still running first', async () => {
    const { pgdata, calls, upgrade } = setup({ running: true });
    cluster(pgdata, 16);
    await upgradeIfNeeded(upgrade);
    expect(calls.slice(0, 4)).toEqual(['new pg_ctl --version', 'old pg_ctl status', 'old pg_ctl stop', 'old pg_ctl start']);
  });

  it.each(['new pg_dump', 'new pg_restore', 'old pg_ctl start'])('leaves the data unchanged if %s fails', async (failOn) => {
    const { dataDir, pgdata, calls, upgrade } = setup({ failOn });
    cluster(pgdata, 16, 'family data');
    await expect(upgradeIfNeeded(upgrade)).rejects.toThrow(/from PostgreSQL 16 to 18 failed, the data is unchanged.*boom/);
    expect(clusterMajor(pgdata)).toBe(16);
    expect(fs.readFileSync(path.join(pgdata, 'data'), 'utf8')).toBe('family data');
    expect(fs.readdirSync(dataDir).filter((name) => name.startsWith('pgdata'))).toEqual(['pgdata']);
    // A server that was started is stopped again
    const started = calls.filter((c) => c.endsWith('pg_ctl start') && c !== failOn).length;
    expect(calls.filter((c) => c.endsWith('pg_ctl stop'))).toHaveLength(started);
  });

  it('refuses data of a newer major version and an upgrade without the old server', async () => {
    const { pgDir, pgdata, upgrade } = setup();
    cluster(pgdata, 19);
    await expect(upgradeIfNeeded(upgrade)).rejects.toThrow(/created by PostgreSQL 19, this version of Cognatio brings PostgreSQL 18/);
    cluster(pgdata, 15);
    await expect(upgradeIfNeeded(upgrade)).rejects.toThrow(/does not bring PostgreSQL 15/);
    fs.rmSync(oldServerDir(pgDir, 16), { recursive: true });
    cluster(pgdata, 16);
    await expect(upgradeIfNeeded(upgrade)).rejects.toThrow(/does not bring PostgreSQL 16/);
    expect(clusterMajor(pgdata)).toBe(16);
  });

  it('finishes an upgrade that was interrupted between the renames and removes an incomplete one', async () => {
    const { dataDir, pgdata, calls, upgrade } = setup();
    cluster(`${pgdata}.upgrade`, 18, 'converted');
    fs.writeFileSync(`${pgdata}.upgrade.done`, '');
    cluster(path.join(dataDir, 'pgdata-16.old'), 16);
    expect(await upgradeIfNeeded(upgrade)).toBeNull();
    expect(fs.readFileSync(path.join(pgdata, 'data'), 'utf8')).toBe('converted');
    expect(fs.existsSync(`${pgdata}.upgrade.done`)).toBe(false);
    expect(calls).toEqual(['new pg_ctl --version']);

    // Crash before the renames: the half new cluster goes, the old folder is converted again
    fs.rmSync(pgdata, { recursive: true });
    cluster(pgdata, 16, 'family data');
    cluster(`${pgdata}.upgrade`, 18, 'half');
    expect(await upgradeIfNeeded(upgrade)).toBe(16);
    expect(fs.readFileSync(path.join(pgdata, 'data'), 'utf8')).toBe('family data');
  });
});

describe('pruneOldClusters', () => {
  it('removes old database folders 30 days after the upgrade', () => {
    const at = (name: string, iso: string | null) => {
      cluster(path.join(tmp, name), 16);
      if (iso) {
        fs.writeFileSync(path.join(tmp, name, 'cognatio-upgraded-at.txt'), iso);
      }
    };
    at('pgdata-16.old', '2026-09-01T00:00:00Z');
    at('pgdata-15.old', '2026-10-01T00:00:00Z');
    at('pgdata-14.old', null);
    at('pgdata', '2026-01-01T00:00:00Z');
    const now = Date.parse('2026-10-12T00:00:00Z');
    expect(pruneOldClusters(tmp, log, now)).toEqual([path.join(tmp, 'pgdata-16.old')]);
    expect(fs.readdirSync(tmp).sort()).toEqual(['pgdata', 'pgdata-14.old', 'pgdata-15.old']);
    expect(pruneOldClusters(path.join(tmp, 'missing'), log)).toEqual([]);
  });
});
