// Local development database: the PostgreSQL that the Windows app bundles, started as a plain server on 127.0.0.1:5432.
//   node scripts/dev-db.mjs start | stop | status | backup | restore <file> | upgrade | reset --yes
// Data lives in .dev-data/ (gitignored; DEV_DB_DIR chooses another folder), the server log in .dev-data/postgres.log. Two databases are created:
// cognatio_db (development) and cognatio_test (E2E and upgrade tests, see e2e/scripts/guard.mjs).
// Binaries: tools/postgres (npm run postgres:fetch) or the folder in COGNATIO_PG_DIR – a PostgreSQL 18 of your own works too.
// upgrade: converts a data folder of an earlier PostgreSQL major version with its server from tools/postgres/upgrade/<major>
// (COGNATIO_PG_OLD_DIR chooses another one); the old folder stays as pgdata-<major>.old until you delete it.
// Authentication is "trust" on the loopback address only, so the passwords in the connection strings are not checked.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.resolve(process.env.DEV_DB_DIR?.trim() || path.join(root, '.dev-data'));
const pgdata = path.join(dataRoot, 'pgdata');
const serverLog = path.join(dataRoot, 'postgres.log');
const PORT = Number(process.env.DEV_DB_PORT ?? 5432);
const USER = 'cognatio';
const DATABASES = ['cognatio_db', 'cognatio_test'];

const pgDir = path.resolve(process.env.COGNATIO_PG_DIR?.trim() || path.join(root, 'tools', 'postgres'));
const binIn = (dir, name) => path.join(dir, 'bin', process.platform === 'win32' ? `${name}.exe` : name);
const bin = (name) => binIn(pgDir, name);

const fail = (message) => {
  console.error(`[dev-db] ${message}`);
  process.exit(1);
};

const run = (name, args, { quiet = false, dir = pgDir } = {}) => {
  const result = spawnSync(binIn(dir, name), args, { encoding: 'utf8', stdio: quiet ? 'ignore' : ['ignore', 'pipe', 'pipe'] });
  return { code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
};

const portInUse = () =>
  new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: '127.0.0.1' });
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('error', () => resolve(false));
  });

const isRunning = () => fs.existsSync(path.join(pgdata, 'PG_VERSION')) && run('pg_ctl', ['status', '-D', pgdata]).code === 0;

function requireBinaries() {
  if (!fs.existsSync(bin('pg_ctl'))) {
    fail(`PostgreSQL not found in ${pgDir}. Run "npm run postgres:fetch" (Windows and Linux) or set COGNATIO_PG_DIR to a PostgreSQL 18 folder.`);
  }
}

/** Major version of the programs in `dir` and of the data folder (null if there is none yet) */
const binMajor = (dir = pgDir) => Number(/\(PostgreSQL\)\s+(\d+)/.exec(run('pg_ctl', ['--version'], { dir }).stdout)?.[1]);
const dataMajor = (folder = pgdata) =>
  fs.existsSync(path.join(folder, 'PG_VERSION')) ? Number.parseInt(fs.readFileSync(path.join(folder, 'PG_VERSION'), 'utf8'), 10) : null;

async function start() {
  requireBinaries();
  const major = dataMajor();
  if (major !== null && major !== binMajor()) {
    fail(`The data in ${pgdata} belongs to PostgreSQL ${major}, the programs are PostgreSQL ${binMajor()}. Run "npm run db:upgrade" to convert it.`);
  }
  if (isRunning()) {
    console.log(`[dev-db] already running on port ${PORT}`);
    return;
  }
  if (await portInUse()) {
    fail(`Port ${PORT} is in use by another program (another PostgreSQL?). Set DEV_DB_PORT to use another port.`);
  }
  fs.mkdirSync(dataRoot, { recursive: true });
  if (!fs.existsSync(path.join(pgdata, 'PG_VERSION'))) {
    console.log('[dev-db] creating the database cluster ...');
    const init = run('initdb', ['-D', pgdata, '-U', USER, '--encoding=UTF8', '--locale=C', '--auth=trust']);
    if (init.code !== 0) {
      fail(`initdb failed: ${init.stderr || init.stdout}`);
    }
  }
  // A crash or a closed computer can leave a pid file behind
  fs.rmSync(path.join(pgdata, 'postmaster.pid'), { force: true });
  // quiet: the server stays behind as a background process and would keep the output pipes open
  const started = run('pg_ctl', ['start', '-D', pgdata, '-w', '-t', '60', '-l', serverLog, '-o', `-p ${PORT} -c listen_addresses=127.0.0.1`], { quiet: true });
  if (started.code !== 0) {
    const tail = fs.existsSync(serverLog) ? fs.readFileSync(serverLog, 'utf8').trim().split('\n').slice(-5).join('\n') : '';
    fail(`The server did not start:\n${tail}`);
  }
  for (const name of DATABASES) {
    const exists = run('psql', [
      '-h',
      '127.0.0.1',
      '-p',
      String(PORT),
      '-U',
      USER,
      '-d',
      'postgres',
      '-tAc',
      `SELECT 1 FROM pg_database WHERE datname = '${name}'`,
    ]);
    if (exists.stdout.trim() !== '1') {
      const created = run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), '-U', USER, name]);
      if (created.code !== 0) {
        fail(`createdb ${name} failed: ${created.stderr}`);
      }
      console.log(`[dev-db] database ${name} created`);
    }
  }
  console.log(`[dev-db] running on 127.0.0.1:${PORT} (data: ${dataRoot})`);
}

function stop() {
  requireBinaries();
  if (!isRunning()) {
    console.log('[dev-db] not running');
    return;
  }
  const stopped = run('pg_ctl', ['stop', '-D', pgdata, '-m', 'fast', '-w', '-t', '60']);
  if (stopped.code !== 0) {
    fail(`pg_ctl stop failed: ${stopped.stderr || stopped.stdout}`);
  }
  console.log('[dev-db] stopped');
}

const backupDir = path.join(root, 'backups');
const KEEP = 14;
const connection = ['-h', '127.0.0.1', '-p', String(PORT), '-U', USER];

/** pg_dump of cognatio_db into backups/ (the newest 14 are kept); the uploaded files in backend/uploads are not part of it */
function backup() {
  requireBinaries();
  if (!isRunning()) {
    fail('The database is not running (npm run db:start).');
  }
  fs.mkdirSync(backupDir, { recursive: true });
  const t = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}_${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
  const file = path.join(backupDir, `cognatio_db_${stamp}.dump`);
  const dumped = run('pg_dump', [...connection, '-Fc', '-f', file, 'cognatio_db']);
  if (dumped.code !== 0) {
    fail(`pg_dump failed: ${dumped.stderr}`);
  }
  const old = fs
    .readdirSync(backupDir)
    .filter((n) => n.startsWith('cognatio_db_') && n.endsWith('.dump'))
    .sort()
    .slice(0, -KEEP);
  old.forEach((n) => fs.rmSync(path.join(backupDir, n)));
  console.log(`[dev-db] backup: ${file}`);
}

/** Replaces the content of cognatio_db with a dump made by "backup" */
function restore(file) {
  requireBinaries();
  if (!file || !fs.existsSync(file)) {
    fail('usage: node scripts/dev-db.mjs restore <dump file>');
  }
  if (!isRunning()) {
    fail('The database is not running (npm run db:start).');
  }
  const restored = run('pg_restore', [...connection, '-d', 'cognatio_db', '--clean', '--if-exists', '--no-owner', file]);
  if (restored.code !== 0) {
    fail(`pg_restore failed: ${restored.stderr}`);
  }
  console.log('[dev-db] restored');
}

/**
 * Converts the data folder of an earlier major version: the old server is started on it, the current pg_dump saves every
 * database, the current initdb creates a new cluster next to it, pg_restore fills it. Only then the old folder becomes
 * pgdata-<major>.old (kept until you delete it). If a step fails, the new cluster is removed and the old folder is untouched.
 */
async function upgrade() {
  requireBinaries();
  const from = dataMajor();
  const to = binMajor();
  if (from === null || from === to) {
    console.log(`[dev-db] nothing to convert (PostgreSQL ${to})`);
    return;
  }
  if (from > to) {
    fail(`The data belongs to PostgreSQL ${from}, newer than the programs (${to}).`);
  }
  const oldDir = path.resolve(process.env.COGNATIO_PG_OLD_DIR?.trim() || path.join(pgDir, 'upgrade', String(from)));
  if (!fs.existsSync(binIn(oldDir, 'pg_ctl')) || binMajor(oldDir) !== from) {
    fail(`PostgreSQL ${from} is needed for the conversion but not in ${oldDir} (npm run postgres:fetch, or set COGNATIO_PG_OLD_DIR).`);
  }
  if (run('pg_ctl', ['status', '-D', pgdata], { dir: oldDir }).code === 0) {
    fail(`The database is still running with PostgreSQL ${from} – stop it first: COGNATIO_PG_DIR=${oldDir} npm run db:stop`);
  }
  if (await portInUse()) {
    fail(`Port ${PORT} is in use by another program. Set DEV_DB_PORT to use another port.`);
  }
  const old = path.join(dataRoot, `pgdata-${from}.old`);
  if (fs.existsSync(old)) {
    fail(`${old} exists from an earlier conversion – delete or move it first.`);
  }
  const next = `${pgdata}.upgrade`;
  const dumps = path.join(dataRoot, `upgrade-from-${from}`);
  const startOn = (dir, folder) =>
    run('pg_ctl', ['start', '-D', folder, '-w', '-t', '60', '-l', serverLog, '-o', `-p ${PORT} -c listen_addresses=127.0.0.1`], { dir, quiet: true }).code ===
    0;
  const stopOn = (dir, folder) => run('pg_ctl', ['stop', '-D', folder, '-m', 'fast', '-w', '-t', '60'], { dir });
  let running = null;
  const abort = (message) => {
    if (running) {
      stopOn(...running);
    }
    fs.rmSync(next, { recursive: true, force: true });
    fail(`${message}\nNothing was changed: ${pgdata} is still the PostgreSQL ${from} data (the dumps stay in ${dumps}).`);
  };

  console.log(`[dev-db] converting PostgreSQL ${from} → ${to} ...`);
  fs.rmSync(next, { recursive: true, force: true });
  fs.rmSync(path.join(pgdata, 'postmaster.pid'), { force: true });
  fs.mkdirSync(dumps, { recursive: true });
  if (!startOn(oldDir, pgdata)) {
    abort('The old server did not start (see the server log).');
  }
  running = [oldDir, pgdata];
  const list = run(
    'psql',
    [...connection, '-d', 'postgres', '-tAc', "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres' ORDER BY 1"],
    {
      dir: oldDir,
    },
  );
  if (list.code !== 0) {
    abort(`Listing the databases failed: ${list.stderr}`);
  }
  const databases = list.stdout.split(/\r?\n/).filter(Boolean);
  for (const name of databases) {
    // The current pg_dump reads older servers (the other way round it does not work)
    const dumped = run('pg_dump', [...connection, '-Fc', '-f', path.join(dumps, `${name}.dump`), name]);
    if (dumped.code !== 0) {
      abort(`pg_dump ${name} failed: ${dumped.stderr}`);
    }
    console.log(`[dev-db] saved ${name}`);
  }
  stopOn(oldDir, pgdata);
  running = null;

  const init = run('initdb', ['-D', next, '-U', USER, '--encoding=UTF8', '--locale=C', '--auth=trust']);
  if (init.code !== 0) {
    abort(`initdb failed: ${init.stderr || init.stdout}`);
  }
  if (!startOn(pgDir, next)) {
    abort('The new server did not start (see the server log).');
  }
  running = [pgDir, next];
  for (const name of databases) {
    const restored = run('pg_restore', [...connection, '--create', '--no-owner', '--exit-on-error', '-d', 'postgres', path.join(dumps, `${name}.dump`)]);
    if (restored.code !== 0) {
      abort(`pg_restore ${name} failed: ${restored.stderr}`);
    }
    console.log(`[dev-db] restored ${name}`);
  }
  stopOn(pgDir, next);
  running = null;

  fs.renameSync(pgdata, old);
  fs.renameSync(next, pgdata);
  fs.rmSync(dumps, { recursive: true, force: true });
  console.log(`[dev-db] converted to PostgreSQL ${to}. The old data stays in ${old} – delete it once everything works.`);
}

const command = process.argv[2];
if (command === 'start') {
  await start();
} else if (command === 'stop') {
  stop();
} else if (command === 'status') {
  requireBinaries();
  console.log(isRunning() ? `[dev-db] running on port ${PORT}` : '[dev-db] not running');
} else if (command === 'backup') {
  backup();
} else if (command === 'restore') {
  restore(process.argv[3]);
} else if (command === 'upgrade') {
  await upgrade();
} else if (command === 'reset') {
  requireBinaries();
  if (!process.argv.includes('--yes')) {
    fail('reset deletes ALL local development and test data (.dev-data). Repeat with --yes to confirm.');
  }
  stop();
  fs.rmSync(dataRoot, { recursive: true, force: true });
  console.log('[dev-db] .dev-data deleted');
} else {
  fail('usage: node scripts/dev-db.mjs start | stop | status | backup | restore <file> | upgrade | reset --yes');
}
