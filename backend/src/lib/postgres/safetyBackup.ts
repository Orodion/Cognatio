import fs from 'node:fs';
import path from 'node:path';
import { PG_DATABASE, PG_USER, type BundledPostgres } from './bundledPostgres.js';
import { run as defaultRun, type Run } from './run.js';

const PREFIX = 'cognatio-db-';
const SUFFIX = '.dump';
const DAY_MS = 24 * 60 * 60 * 1000;

type Server = Pick<BundledPostgres, 'port' | 'password' | 'binDir'>;

const exe = (binDir: string, name: string) => path.join(binDir, process.platform === 'win32' ? `${name}.exe` : name);
const connection = (server: Server) => ['-h', '127.0.0.1', '-p', String(server.port), '-U', PG_USER];

/** The safety backups, newest first (the backup ZIPs of the user are kept elsewhere) */
export function listDumps(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
    .sort()
    .reverse()
    .map((name) => path.join(dir, name));
}

/** The last `keep` safety backups stay, older ones are deleted */
export function pruneDumps(dir: string, keep = 5): string[] {
  const old = listDumps(dir).slice(keep);
  old.forEach((file) => fs.rmSync(file, { force: true }));
  return old;
}

/** At most one daily safety backup (those before a migration come on top) */
export function dumpDue(dir: string, now = Date.now()): boolean {
  const [newest] = listDumps(dir);
  return !newest || now - fs.statSync(newest).mtimeMs >= DAY_MS;
}

/** `pg_dump -Fc` (compressed custom format) into the folder; returns the file. The reason ends up in the name. */
export async function createDump(server: Server, dir: string, reason: string, run: Run = defaultRun, now = new Date()): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const file = path.join(dir, `${PREFIX}${stamp}-${reason}${SUFFIX}`);
  const result = await run(exe(server.binDir, 'pg_dump'), ['-Fc', ...connection(server), '-f', file, PG_DATABASE], { PGPASSWORD: server.password });
  if (result.code !== 0) {
    fs.rmSync(file, { force: true });
    throw new Error(`pg_dump failed (exit code ${result.code}): ${result.stderr.trim()}`);
  }
  pruneDumps(dir);
  return file;
}

/** Restores a safety backup over the current database (drops and recreates all objects) */
export async function restoreDump(server: Server, file: string, run: Run = defaultRun): Promise<void> {
  const result = await run(exe(server.binDir, 'pg_restore'), ['--clean', '--if-exists', '--no-owner', ...connection(server), '-d', PG_DATABASE, file], {
    PGPASSWORD: server.password,
  });
  if (result.code !== 0) {
    throw new Error(`pg_restore failed (exit code ${result.code}): ${result.stderr.trim()}`);
  }
}
