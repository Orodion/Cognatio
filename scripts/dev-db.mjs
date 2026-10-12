// Local development database: the PostgreSQL that the Windows app bundles, started as a plain server on 127.0.0.1:5432.
//   node scripts/dev-db.mjs start | stop | status | backup | restore <file> | reset --yes
// Data lives in .dev-data/ (gitignored), the server log in .dev-data/postgres.log. Two databases are created:
// cognatio_db (development) and cognatio_test (E2E and upgrade tests, see e2e/scripts/guard.mjs).
// Binaries: tools/postgres (npm run postgres:fetch) or the folder in COGNATIO_PG_DIR – a PostgreSQL 16 of your own works too.
// Authentication is "trust" on the loopback address only, so the passwords in the connection strings are not checked.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(root, '.dev-data');
const pgdata = path.join(dataRoot, 'pgdata');
const serverLog = path.join(dataRoot, 'postgres.log');
const PORT = Number(process.env.DEV_DB_PORT ?? 5432);
const USER = 'cognatio';
const DATABASES = ['cognatio_db', 'cognatio_test'];

const pgDir = path.resolve(process.env.COGNATIO_PG_DIR?.trim() || path.join(root, 'tools', 'postgres'));
const bin = (name) => path.join(pgDir, 'bin', process.platform === 'win32' ? `${name}.exe` : name);

const fail = (message) => {
  console.error(`[dev-db] ${message}`);
  process.exit(1);
};

const run = (name, args, { quiet = false } = {}) => {
  const result = spawnSync(bin(name), args, { encoding: 'utf8', stdio: quiet ? 'ignore' : ['ignore', 'pipe', 'pipe'] });
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
    fail(`PostgreSQL not found in ${pgDir}. Run "npm run postgres:fetch" (Windows and Linux) or set COGNATIO_PG_DIR to a PostgreSQL 16 folder.`);
  }
}

async function start() {
  requireBinaries();
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
} else if (command === 'reset') {
  requireBinaries();
  if (!process.argv.includes('--yes')) {
    fail('reset deletes ALL local development and test data (.dev-data). Repeat with --yes to confirm.');
  }
  stop();
  fs.rmSync(dataRoot, { recursive: true, force: true });
  console.log('[dev-db] .dev-data deleted');
} else {
  fail('usage: node scripts/dev-db.mjs start | stop | status | backup | restore <file> | reset --yes');
}
