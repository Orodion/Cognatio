import fs from 'node:fs';
import path from 'node:path';

/**
 * COGNATIO_DATA_DIR: one folder for all data of an installation (the Windows app uses %APPDATA%\Cognatio),
 * with `uploads/`, `backups/` and `logs/` below it. Single settings (UPLOAD_DIR, BACKUP_DIR, LOG_FILE) still
 * take precedence; without it the folders of the development setup apply. Returns null if it is not set.
 */
export function dataDirPath(env: NodeJS.ProcessEnv, ...parts: string[]): string | null {
  const dir = env.COGNATIO_DATA_DIR?.trim();
  return dir ? path.resolve(dir, ...parts) : null;
}

/**
 * Creates the data folder (COGNATIO_DATA_DIR) if it does not exist yet, readable by the user only: it holds the database,
 * photos, backups and logs, the folders below it are protected with it. An existing folder is left as it is (the user
 * chose it). Returns the folder, or null without COGNATIO_DATA_DIR.
 */
export function ensureDataDir(env: NodeJS.ProcessEnv = process.env): string | null {
  const dir = dataDirPath(env);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}
