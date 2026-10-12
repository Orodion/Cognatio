/**
 * Applies the database migrations (`prisma/migrations/<name>/migration.sql`) without the Prisma CLI, so an
 * installed application does not have to ship it and other databases (e.g. PGlite on phones) can be migrated
 * the same way. Keeps the bookkeeping table of Prisma (`_prisma_migrations`), so `prisma migrate dev` and
 * `prisma migrate status` keep working on the same database during development.
 *
 * Each migration runs in its own transaction together with its entry in the table: it is applied completely
 * or not at all. Migrations must therefore not contain statements that PostgreSQL forbids in transactions
 * (e.g. `CREATE INDEX CONCURRENTLY`).
 */
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export interface Migration {
  name: string;
  sql: string;
  /** SHA-256 of the file, as Prisma stores it */
  checksum: string;
}

/** The part of a database connection the runner needs (pg.Client) */
export interface MigrationDb {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

interface MigrationLog {
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
}

/** Stable reason codes for the caller (Windows app: error dialog, restore of the safety backup) */
export type MigrationErrorReason = 'MIGRATION_FAILED' | 'FAILED_MIGRATION_IN_DATABASE' | 'DATABASE_NEWER';

export class MigrationError extends Error {
  constructor(
    public reason: MigrationErrorReason,
    message: string,
    public migration?: string,
    /** Migrations of this run that were applied (and stay applied) before this one failed */
    public applied: string[] = [],
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/** Same lock as Prisma: never two runs (or a runner and `prisma migrate`) at the same time */
const LOCK_KEY = 72707369;

/** Table of Prisma (prisma-engines, schema of `_prisma_migrations`) */
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`;

/** Folder of the migrations: MIGRATIONS_DIR or prisma/migrations in the working directory (backend/) */
export const migrationsDir = (env: NodeJS.ProcessEnv = process.env) => path.resolve(env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'prisma', 'migrations'));

/** All migrations of the folder, in the order of their names (they start with a timestamp) */
export function readMigrations(dir = migrationsDir()): Migration[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'migration.sql')))
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const content = fs.readFileSync(path.join(dir, name, 'migration.sql'));
      return { name, sql: content.toString('utf8'), checksum: createHash('sha256').update(content).digest('hex') };
    });
}

interface AppliedRow {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

/**
 * Brings the database up to date. Refuses if the database contains a failed migration or migrations this
 * version does not know (data written by a newer version – the "downgrade guard"). Returns the names of the
 * migrations that were applied. `beforePending` runs once before the first pending migration is applied to a
 * database that already has migrations (Windows app: safety backup); if it throws, nothing is changed.
 */
export async function migrate(
  db: MigrationDb,
  migrations: Migration[],
  log: MigrationLog,
  beforePending?: (pending: string[]) => Promise<void>,
): Promise<string[]> {
  await db.query(CREATE_TABLE);
  await db.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
  try {
    const { rows } = await db.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at');
    const applied = (rows as unknown as AppliedRow[]).filter((row) => row.rolled_back_at === null);

    const failed = applied.find((row) => row.finished_at === null);
    if (failed) {
      throw new MigrationError('FAILED_MIGRATION_IN_DATABASE', `Migration ${failed.migration_name} failed earlier and was not resolved`, failed.migration_name);
    }
    const known = new Map(migrations.map((m) => [m.name, m]));
    const unknown = applied.filter((row) => !known.has(row.migration_name)).map((row) => row.migration_name);
    if (unknown.length) {
      throw new MigrationError('DATABASE_NEWER', `The database was migrated by a newer version (unknown migrations: ${unknown.join(', ')})`, unknown[0]);
    }
    for (const row of applied) {
      if (known.get(row.migration_name)?.checksum !== row.checksum) {
        log.warn('Migration was changed after it had been applied', { migration: row.migration_name });
      }
    }

    const done = new Set(applied.map((row) => row.migration_name));
    const pending = migrations.filter((m) => !done.has(m.name));
    if (pending.length && applied.length) {
      await beforePending?.(pending.map((m) => m.name));
    }
    const appliedNow: string[] = [];
    for (const migration of pending) {
      try {
        await apply(db, migration);
      } catch (err) {
        if (err instanceof MigrationError) {
          err.applied = appliedNow;
        }
        throw err;
      }
      appliedNow.push(migration.name);
      log.info('Migration applied', { migration: migration.name });
    }
    return appliedNow;
  } finally {
    await db.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
  }
}

async function apply(db: MigrationDb, migration: Migration) {
  const id = randomUUID();
  await db.query('BEGIN');
  try {
    await db.query('INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count) VALUES ($1, $2, $3, now(), 0)', [
      id,
      migration.checksum,
      migration.name,
    ]);
    await db.query(migration.sql);
    await db.query('UPDATE "_prisma_migrations" SET finished_at = now(), applied_steps_count = 1 WHERE id = $1', [id]);
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw new MigrationError('MIGRATION_FAILED', `Migration ${migration.name} failed: ${err instanceof Error ? err.message : String(err)}`, migration.name);
  }
}

/** Creates the database of the connection URL if it does not exist yet (like `prisma migrate deploy`) */
export async function ensureDatabase(url: string, log: MigrationLog) {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    return;
  } catch (err) {
    // 3D000: database does not exist
    if ((err as { code?: string }).code !== '3D000') {
      throw err;
    }
  } finally {
    await client.end().catch(() => undefined);
  }
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  target.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: target.toString() });
  await admin.connect();
  try {
    // Identifiers cannot be passed as parameters – quoted, with doubled quotes
    await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
    log.info('Database created', { database: name });
  } finally {
    await admin.end();
  }
}

/** Creates the database if needed and applies all pending migrations of the folder */
export async function runMigrations(
  url: string,
  log: MigrationLog,
  dir = migrationsDir(),
  beforePending?: (pending: string[]) => Promise<void>,
): Promise<string[]> {
  await ensureDatabase(url, log);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await migrate(client, readMigrations(dir), log, beforePending);
  } finally {
    await client.end();
  }
}
