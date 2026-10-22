import fs from 'node:fs';
import path from 'node:path';
import { PG_DATABASE, PG_USER } from './bundledPostgres.js';
import { run as defaultRun, type Run } from './run.js';

type Log = { info: (msg: string, meta?: Record<string, unknown>) => void; warn: (msg: string, meta?: Record<string, unknown>) => void };

const DAY_MS = 24 * 60 * 60 * 1000;
/** How long the database folder of the previous major version stays as a fallback after an upgrade */
export const OLD_CLUSTER_DAYS = 30;
/** File in an old database folder with the time of the upgrade (the folder itself is no longer used) */
const UPGRADED_AT = 'cognatio-upgraded-at.txt';

const exe = (binDir: string, name: string) => path.join(binDir, process.platform === 'win32' ? `${name}.exe` : name);

/** Folder of the server of an earlier major version that an upgrade release ships next to the current one */
export const oldServerDir = (pgDir: string, major: number) => path.join(pgDir, 'upgrade', String(major));

/** Major version that created the database folder (`PG_VERSION`), null for a folder without one */
export function clusterMajor(pgdata: string): number | null {
  const file = path.join(pgdata, 'PG_VERSION');
  return fs.existsSync(file) ? Number.parseInt(fs.readFileSync(file, 'utf8').trim(), 10) : null;
}

/** Major version of the PostgreSQL programs in `binDir` (from `pg_ctl --version`) */
export async function binMajor(binDir: string, run: Run = defaultRun): Promise<number> {
  const result = await run(exe(binDir, 'pg_ctl'), ['--version']);
  const match = /\(PostgreSQL\)\s+(\d+)/.exec(result.stdout);
  if (result.code !== 0 || !match) {
    throw new Error(`The version of PostgreSQL in ${binDir} could not be determined: ${(result.stderr || result.stdout).trim()}`);
  }
  return Number(match[1]);
}

/** Windows: a virus scanner or the indexer may hold a file of a folder that was just closed for a moment */
async function rename(from: string, to: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 10 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

async function check(result: ReturnType<Run>, what: string) {
  const r = await result;
  if (r.code !== 0) {
    throw new Error(`${what} failed (exit code ${r.code}): ${(r.stderr || r.stdout).trim()}`);
  }
  return r;
}

export interface UpgradeOptions {
  /** Folder of the bundled (current) PostgreSQL */
  pgDir: string;
  /** Database folder (`COGNATIO_DATA_DIR/pgdata`) */
  pgdata: string;
  /** Password of the database user (stays the same) */
  password: string;
  /** Folder for the dump that carries the data across (backups/db) */
  dumpDir: string;
  /** Server log (logs/postgres.log) */
  serverLog: string;
  log: Log;
  /** A free port on 127.0.0.1 */
  port: () => Promise<number>;
  /** Creates an empty cluster with the current programs (the same as on the first start) */
  initCluster: (pgdata: string) => Promise<void>;
  /** Folder of the server of an earlier major version (default: `upgrade/<major>` in the bundled PostgreSQL) */
  findOldServer?: (major: number) => string;
  run?: Run;
  now?: () => Date;
}

/**
 * Finishes an upgrade that was interrupted between the two renames: `pgdata` is missing, the new cluster is complete
 * (marker file) – it becomes `pgdata`. An incomplete new cluster is removed, `pgdata` is then still the old one.
 */
function recoverInterrupted(pgdata: string, log: Log) {
  const next = `${pgdata}.upgrade`;
  const done = `${next}.done`;
  if (!fs.existsSync(pgdata) && fs.existsSync(done) && fs.existsSync(path.join(next, 'PG_VERSION'))) {
    fs.renameSync(next, pgdata);
    log.warn('Interrupted database upgrade completed');
  }
  if (fs.existsSync(next)) {
    fs.rmSync(next, { recursive: true, force: true });
    log.warn('Incomplete database upgrade removed – the previous database folder is used');
  }
  fs.rmSync(done, { force: true });
}

/**
 * PostgreSQL major upgrade (e.g. 16 → 18), at the start before the server runs. An upgrade release ships the server
 * of the earlier version in `upgrade/<major>`: it is started on the old folder, the current `pg_dump` saves the data,
 * the current `initdb` creates a new cluster next to it (`pgdata.upgrade`), `pg_restore` fills it. Only then the old
 * folder becomes `pgdata-<major>.old` (kept for 30 days) and the new one `pgdata`. If anything fails before that, the
 * new cluster is removed and the old folder is untouched – the previous version of the app still opens it.
 * Returns the major version that was upgraded from, or null if nothing was to do.
 */
export async function upgradeIfNeeded(options: UpgradeOptions): Promise<number | null> {
  const { pgDir, pgdata, password, dumpDir, serverLog, log, port, initCluster, run = defaultRun, now = () => new Date() } = options;
  const findOldServer = options.findOldServer ?? ((major: number) => oldServerDir(pgDir, major));
  recoverInterrupted(pgdata, log);
  const from = clusterMajor(pgdata);
  if (from === null) {
    return null;
  }
  const binDir = path.join(pgDir, 'bin');
  const to = await binMajor(binDir, run);
  if (from === to) {
    return null;
  }
  if (from > to) {
    throw new Error(
      `The database was created by PostgreSQL ${from}, this version of Cognatio brings PostgreSQL ${to} – the data belongs to a newer version of Cognatio. Install that version again.`,
    );
  }
  const oldBin = path.join(findOldServer(from), 'bin');
  if (!fs.existsSync(exe(oldBin, 'pg_ctl'))) {
    throw new Error(
      `The database was created by PostgreSQL ${from} and has to be converted to PostgreSQL ${to}, but this version of Cognatio does not bring PostgreSQL ${from} for that. First install the last version of Cognatio that converts it, then this one.`,
    );
  }
  log.warn('Database of an earlier PostgreSQL version – converting it', { from, to });

  const stamp = now().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  fs.mkdirSync(dumpDir, { recursive: true });
  const dump = path.join(dumpDir, `cognatio-db-${stamp}-before-postgres-${to}.dump`);
  const next = `${pgdata}.upgrade`;
  const env = { PGPASSWORD: password };
  const connection = (p: number) => ['-h', '127.0.0.1', '-p', String(p), '-U', PG_USER];
  const start = async (bin: string, folder: string) => {
    const p = await port();
    await check(
      run(exe(bin, 'pg_ctl'), ['start', '-D', folder, '-w', '-t', '60', '-l', serverLog, '-o', `-p ${p} -c listen_addresses=127.0.0.1`], undefined, true),
      'pg_ctl start',
    );
    return p;
  };
  const stop = (bin: string, folder: string) => check(run(exe(bin, 'pg_ctl'), ['stop', '-D', folder, '-m', 'fast', '-w', '-t', '60']), 'pg_ctl stop');
  let running: { bin: string; folder: string } | null = null;

  try {
    // A server of an earlier run may still hold the old folder
    if ((await run(exe(oldBin, 'pg_ctl'), ['status', '-D', pgdata])).code === 0) {
      await stop(oldBin, pgdata);
    }
    fs.rmSync(path.join(pgdata, 'postmaster.pid'), { force: true });

    // The current pg_dump reads older servers (the other way round it does not work)
    const oldPort = await start(oldBin, pgdata);
    running = { bin: oldBin, folder: pgdata };
    await check(run(exe(binDir, 'pg_dump'), ['-Fc', ...connection(oldPort), '-f', dump, PG_DATABASE], env), 'pg_dump');
    await stop(oldBin, pgdata);
    running = null;

    await initCluster(next);
    const newPort = await start(binDir, next);
    running = { bin: binDir, folder: next };
    // --create: the database is created as it was (encoding, locale), the owner is the user of the new cluster
    await check(
      run(exe(binDir, 'pg_restore'), ['--create', '--no-owner', '--exit-on-error', ...connection(newPort), '-d', 'postgres', dump], env),
      'pg_restore',
    );
    await stop(binDir, next);
    running = null;
  } catch (err) {
    if (running) {
      await stop(running.bin, running.folder).catch(() => undefined);
    }
    fs.rmSync(next, { recursive: true, force: true });
    log.warn('Database upgrade failed – the database is unchanged', { from, to, err });
    throw new Error(`Converting the database from PostgreSQL ${from} to ${to} failed, the data is unchanged: ${(err as Error).message}`, { cause: err });
  }

  // Both renames are the only step that is not undone by itself; recoverInterrupted finishes it after a crash
  const old = `${pgdata}-${from}.old`;
  fs.rmSync(old, { recursive: true, force: true });
  fs.writeFileSync(`${next}.done`, '');
  // Written before the rename, so that also an old folder of an interrupted upgrade is removed in time
  fs.writeFileSync(path.join(pgdata, UPGRADED_AT), now().toISOString());
  await rename(pgdata, old);
  await rename(next, pgdata);
  fs.rmSync(`${next}.done`, { force: true });
  log.info('Database converted to the new PostgreSQL version', { from, to, kept: old, dump });
  return from;
}

/** Removes the database folders of earlier major versions whose upgrade is more than `days` ago */
export function pruneOldClusters(dataDir: string, log: Log, now = Date.now(), days = OLD_CLUSTER_DAYS): string[] {
  if (!fs.existsSync(dataDir)) {
    return [];
  }
  const removed: string[] = [];
  for (const name of fs.readdirSync(dataDir)) {
    const folder = path.join(dataDir, name);
    const marker = path.join(folder, UPGRADED_AT);
    if (!/^pgdata-\d+\.old$/.test(name) || !fs.existsSync(marker)) {
      continue;
    }
    const upgradedAt = Date.parse(fs.readFileSync(marker, 'utf8').trim());
    if (Number.isFinite(upgradedAt) && now - upgradedAt >= days * DAY_MS) {
      fs.rmSync(folder, { recursive: true, force: true });
      removed.push(folder);
      log.info('Database folder of the earlier PostgreSQL version removed', { folder });
    }
  }
  return removed;
}
