/** Backup of all family trees via the REST API (/api/v1/backup…) – Settings → Backup */
import { filenameFrom, request } from '@/features/transfer/lib/transfer';
import { saveFile } from '@/lib/platform';

/** Must be sent to the backend with a restore (protection against an accidental call) */
const RESTORE_CONFIRMATION = 'DELETE_ALL';

export interface BackupCounts {
  trees: number;
  deletedTrees: number;
  persons: number;
  deletedPersons: number;
  relations: number;
  events: number;
  notes: number;
  media: number;
  imports: number;
}

export interface BackupPreview {
  createdAt: string;
  appVersion: string;
  version: number;
  counts: BackupCounts;
  /** Family trees of the backup (oldest first) with their number of persons without the recycle bin */
  trees: Array<{ name: string; persons: number; isDeleted: boolean }>;
  /** Media whose file is missing in the backup */
  missingFiles: number;
  /** Current data in the database */
  current: BackupCounts;
}

export interface RestoreResult {
  counts: BackupCounts;
  missingFiles: number;
  /** Backup of the state before the restore (file name in the backup folder) */
  safetyBackup: string;
  backupDir: string;
}

/** Downloads the backup of all family trees */
export async function downloadBackup(): Promise<{
  filename: string;
  /** False if the user cancelled the "Save as" dialog of the app */
  saved: boolean;
  missingMedia: number;
  /** Set when the backup is larger than the app restores (it is saved anyway) */
  overLimit: { sizeMb: number; limitMb: number } | null;
}> {
  const response = await request('/api/v1/backup');
  const filename = filenameFrom(response.headers.get('Content-Disposition'), 'cognatio_backup.zip');
  const saved = await saveFile(await response.blob(), filename);
  const sizeMb = Number(response.headers.get('X-Backup-Size-Mb'));
  const limitMb = Number(response.headers.get('X-Backup-Limit-Mb'));
  return {
    filename,
    saved,
    missingMedia: Number(response.headers.get('X-Missing-Media') ?? 0),
    overLimit: sizeMb > 0 && limitMb > 0 ? { sizeMb, limitMb } : null,
  };
}

const withFile = (file: File, fields: Record<string, string> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.append(key, value);
  }
  data.append('file', file);
  return data;
};

/** Checks the backup and compares it with the current data – changes nothing */
export async function previewBackup(file: File): Promise<BackupPreview> {
  const response = await request('/api/v1/backup/preview', { method: 'POST', body: withFile(file) });
  return response.json();
}

/** Replaces all data with the backup; the backend saves the current state first */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  const response = await request('/api/v1/backup/restore', {
    method: 'POST',
    body: withFile(file, { confirm: RESTORE_CONFIRMATION }),
  });
  return response.json();
}
