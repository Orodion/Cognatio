import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '../generated/prisma/client.js';
import { logger } from './logger.js';
import { dataDirPath } from './files/dataDir.js';

/**
 * Folder of the backups. During development it is next to the backend/ folder (npm run db:backup writes there);
 * BACKUP_DIR overrides it, in the desktop app it is backups/ in COGNATIO_DATA_DIR.
 */
export const backupDir = () => path.resolve(process.env.BACKUP_DIR ?? dataDirPath(process.env, 'backups') ?? path.join(process.cwd(), '..', 'backups'));

/** Version of the application: APP_VERSION (e.g. from CI), otherwise from package.json */
export function appVersion() {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  try {
    return (JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as { version?: string }).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Database dumps (*.dump) in a folder with their modification time; none if the folder is missing */
function dumpsIn(dir: string): Array<{ mtime: number }> {
  try {
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.dump'))
      .map((name) => ({ mtime: fs.statSync(path.join(dir, name)).mtimeMs }));
  } catch {
    return [];
  }
}

/** Latest database backup (*.dump, newest by modification time) and the number of backups; the desktop app keeps its dumps in the subfolder db/ */
export function latestBackup(dir = backupDir()): { at: string | null; count: number } {
  const dumps = [...dumpsIn(dir), ...dumpsIn(path.join(dir, 'db'))];
  const newest = Math.max(...dumps.map((d) => d.mtime));
  return { at: dumps.length ? new Date(newest).toISOString() : null, count: dumps.length };
}

/** State of the application for the settings page */
export async function systemInfo(db: PrismaClient) {
  let database: 'ok' | 'unreachable' = 'ok';
  let counts = { trees: 0, persons: 0, deletedPersons: 0, media: 0, mediaBytes: 0 };
  let lastImportAt: string | null = null;
  try {
    const [trees, persons, deletedPersons, media, lastImport] = await Promise.all([
      db.familyTree.count({ where: { isDeleted: false } }),
      db.person.count({ where: { isDeleted: false } }),
      db.person.count({ where: { isDeleted: true } }),
      db.media.aggregate({ _count: { _all: true }, _sum: { sizeBytes: true } }),
      db.importRecord.findFirst({ orderBy: { importedAt: 'desc' }, select: { importedAt: true } }),
    ]);
    counts = { trees, persons, deletedPersons, media: media._count._all, mediaBytes: media._sum.sizeBytes ?? 0 };
    lastImportAt = lastImport?.importedAt.toISOString() ?? null;
  } catch (err) {
    database = 'unreachable';
    logger.child({ component: 'system' }).error('System status: database unreachable', { err });
  }
  const backup = latestBackup();
  return {
    version: appVersion(),
    database,
    ...counts,
    lastImportAt,
    lastBackupAt: backup.at,
    backupCount: backup.count,
    backupDir: backupDir(),
    logLevel: logger.level,
  };
}
