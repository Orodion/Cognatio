import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { pruneOldClusters, upgradeIfNeeded } from './majorUpgrade.js';
import { run as defaultRun, type Run } from './run.js';

/** Superuser and database of the bundled server */
export const PG_USER = 'cognatio';
export const PG_DATABASE = 'cognatio';

type Log = { info: (msg: string, meta?: Record<string, unknown>) => void; warn: (msg: string, meta?: Record<string, unknown>) => void };

export interface BundledPostgres {
  url: string;
  port: number;
  password: string;
  binDir: string;
  /** Stops the server (fast shutdown: open connections are closed, nothing is lost) */
  stop(): Promise<void>;
}

/** COGNATIO_PG_DIR: folder of the bundled PostgreSQL (contains `bin/`). Returns null if it is not set. */
export function pgDirPath(env: NodeJS.ProcessEnv = process.env): string | null {
  const dir = env.COGNATIO_PG_DIR?.trim();
  return dir ? path.resolve(dir) : null;
}

const exe = (binDir: string, name: string) => path.join(binDir, process.platform === 'win32' ? `${name}.exe` : name);

/**
 * config.json in the data folder: the random password of the database user. Further settings of the app may be
 * stored there later – existing keys are kept.
 */
export function ensurePassword(dataDir: string, pgdataExists: boolean): string {
  const file = path.join(dataDir, 'config.json');
  let config: { postgres?: { password?: string } } = {};
  if (fs.existsSync(file)) {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  const existing = config.postgres?.password;
  if (existing) {
    return existing;
  }
  if (pgdataExists) {
    throw new Error(`The database folder exists but ${file} has no database password – the data cannot be opened. Restore config.json or a backup.`);
  }
  const password = crypto.randomBytes(24).toString('hex');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ ...config, postgres: { ...config.postgres, password } }, null, 2), { mode: 0o600 });
  return password;
}

/** A free TCP port on 127.0.0.1 (the server is started on it right away) */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

export function connectionUrl(port: number, password: string, database = PG_DATABASE): string {
  return `postgresql://${PG_USER}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`;
}

async function check(result: ReturnType<Run>, what: string) {
  const r = await result;
  if (r.code !== 0) {
    throw new Error(`${what} failed (exit code ${r.code}): ${(r.stderr || r.stdout).trim()}`);
  }
  return r;
}

/** Creates the database cluster on first start: UTF-8, locale C (independent of the Windows language), scram-sha-256 */
async function initCluster(binDir: string, pgdata: string, dataDir: string, password: string, run: Run, log: Log) {
  const pwfile = path.join(dataDir, `.initdb-${process.pid}.pw`);
  fs.writeFileSync(pwfile, password, { mode: 0o600 });
  try {
    await check(
      run(exe(binDir, 'initdb'), ['-D', pgdata, '-U', PG_USER, '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', `--pwfile=${pwfile}`]),
      'initdb',
    );
    log.info('Database cluster created', { pgdata });
  } finally {
    fs.rmSync(pwfile, { force: true });
  }
}

/**
 * A server of an earlier run may still be running (crash of the app) or have left a postmaster.pid:
 * a running one is stopped (it then has to be restarted on a new port), a stale pid file is removed.
 */
async function clearEarlierRun(binDir: string, pgdata: string, run: Run, log: Log) {
  const status = await run(exe(binDir, 'pg_ctl'), ['status', '-D', pgdata]);
  if (status.code === 0) {
    log.warn('A database server of an earlier run is still running – stopping it');
    await check(run(exe(binDir, 'pg_ctl'), ['stop', '-D', pgdata, '-m', 'fast', '-w', '-t', '60']), 'pg_ctl stop');
  }
  const pidFile = path.join(pgdata, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    fs.rmSync(pidFile, { force: true });
    log.warn('Stale postmaster.pid removed');
  }
}

export interface StartOptions {
  /** Folder of the bundled PostgreSQL (with `bin/`) */
  pgDir: string;
  /** COGNATIO_DATA_DIR: `pgdata/`, `config.json` and `logs/` are created below it */
  dataDir: string;
  log: Log;
  run?: Run;
  /** Folder of the server of an earlier major version for the upgrade (default: `upgrade/<major>` in pgDir) */
  findOldServer?: (major: number) => string;
}

/**
 * Rotates the server log at the start (no server runs then, so nothing holds the file): from `maxBytes` on
 * `postgres.log` becomes `postgres.log.1`, the older ones move up, only `keep` rotated files stay.
 */
export function rotateServerLog(file: string, maxBytes = 5 * 1024 * 1024, keep = 3): void {
  if (!fs.existsSync(file) || fs.statSync(file).size < maxBytes) {
    return;
  }
  fs.rmSync(`${file}.${keep}`, { force: true });
  for (let i = keep - 1; i >= 1; i--) {
    if (fs.existsSync(`${file}.${i}`)) {
      fs.renameSync(`${file}.${i}`, `${file}.${i + 1}`);
    }
  }
  fs.renameSync(file, `${file}.1`);
}

/**
 * Starts the bundled PostgreSQL: creates the cluster on first start, listens on 127.0.0.1 on a free port
 * (no firewall prompt, not reachable from the network), runs as the current user (no service, no admin rights).
 */
export async function startBundledPostgres({ pgDir, dataDir, log, run = defaultRun, findOldServer }: StartOptions): Promise<BundledPostgres> {
  const binDir = path.join(pgDir, 'bin');
  if (!fs.existsSync(exe(binDir, 'pg_ctl'))) {
    throw new Error(`COGNATIO_PG_DIR ${pgDir} does not contain bin/pg_ctl – PostgreSQL is missing`);
  }
  const pgdata = path.join(dataDir, 'pgdata');
  const logDir = path.join(dataDir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const serverLog = path.join(logDir, 'postgres.log');
  rotateServerLog(serverLog);

  // An upgrade interrupted after its first rename has no pgdata yet, but its data
  const hasData = fs.existsSync(path.join(pgdata, 'PG_VERSION')) || fs.existsSync(`${pgdata}.upgrade.done`);
  const password = ensurePassword(dataDir, hasData);
  await upgradeIfNeeded({
    pgDir,
    pgdata,
    password,
    dumpDir: path.join(dataDir, 'backups', 'db'),
    serverLog,
    log,
    port: freePort,
    initCluster: (folder) => initCluster(binDir, folder, dataDir, password, run, log),
    findOldServer,
    run,
  });
  pruneOldClusters(dataDir, log);
  if (!fs.existsSync(path.join(pgdata, 'PG_VERSION'))) {
    await initCluster(binDir, pgdata, dataDir, password, run, log);
  }
  await clearEarlierRun(binDir, pgdata, run, log);

  const port = await freePort();
  // quiet: the server stays behind as a background process and would keep the output pipes open
  const started = await run(
    exe(binDir, 'pg_ctl'),
    ['start', '-D', pgdata, '-w', '-t', '60', '-l', serverLog, '-o', `-p ${port} -c listen_addresses=127.0.0.1`],
    undefined,
    true,
  );
  if (started.code !== 0) {
    const tail = fs.existsSync(serverLog) ? fs.readFileSync(serverLog, 'utf8').trim().split('\n').slice(-5).join('\n') : '';
    throw new Error(`pg_ctl start failed (exit code ${started.code}): ${tail}`);
  }
  log.info('Database server started', { port });

  let stopped = false;
  return {
    url: connectionUrl(port, password),
    port,
    password,
    binDir,
    async stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      await check(run(exe(binDir, 'pg_ctl'), ['stop', '-D', pgdata, '-m', 'fast', '-w', '-t', '60']), 'pg_ctl stop');
      log.info('Database server stopped');
    },
  };
}
