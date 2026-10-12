import { MigrationError, runMigrations } from '../migrations.js';
import { createDump, restoreDump } from './safetyBackup.js';
import type { BundledPostgres } from './bundledPostgres.js';

type Server = Pick<BundledPostgres, 'url' | 'port' | 'password' | 'binDir'>;

interface Log {
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

export interface MigrateSafelyOptions {
  server: Server;
  /** Folder of the safety backups (backups/db) */
  dumpDir: string;
  log: Log;
  /** Folder of the migrations (default: the ones of the application) */
  migrationsDir?: string;
  /** Replaceable for tests */
  migrate?: typeof runMigrations;
  dump?: typeof createDump;
  restore?: typeof restoreDump;
}

/**
 * Brings the database up to date. Pending migrations on a database with data are preceded by a safety backup; if a
 * migration then fails after earlier ones of the same update were already applied, the backup is restored. Without
 * that the database would stay in a half updated state that neither the new nor the previous version can use (the
 * previous one refuses a database "from the future"). Afterwards the error is thrown as usual, but now the previous
 * version of the app still works with the data.
 */
export async function migrateWithRestore({
  server,
  dumpDir,
  log,
  migrationsDir,
  migrate = runMigrations,
  dump = createDump,
  restore = restoreDump,
}: MigrateSafelyOptions) {
  let safetyBackup: string | null = null;
  try {
    return await migrate(server.url, log, migrationsDir, async (pending) => {
      log.info('Migrations pending – safety backup first', { pending });
      safetyBackup = await dump(server, dumpDir, 'before-migration');
      log.info('Safety backup created', { file: safetyBackup });
    });
  } catch (err) {
    if (!(err instanceof MigrationError) || err.reason !== 'MIGRATION_FAILED' || !err.applied.length || !safetyBackup) {
      throw err;
    }
    log.error('Migration failed after others were applied – restoring the safety backup', {
      migration: err.migration,
      applied: err.applied,
      file: safetyBackup,
    });
    try {
      await restore(server, safetyBackup);
    } catch (restoreErr) {
      log.error('Restoring the safety backup failed', { err: restoreErr, file: safetyBackup });
      throw new MigrationError(err.reason, `${err.message}; restoring the safety backup failed, it is kept in ${safetyBackup}`, err.migration, err.applied);
    }
    log.info('Safety backup restored', { file: safetyBackup });
    throw new MigrationError(err.reason, `${err.message}; the database was restored to the state before the update`, err.migration, []);
  }
}
