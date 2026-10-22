/** Backup of all family trees via the REST API (/api/v1/backup…) – Settings → Backup */
import { downloadChecked, followJob, request, withUpload, type DownloadCheck } from '@/features/transfer/lib/transfer';
import type { ActivityControl } from '@/lib/activity';

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
  /** Sources without the recycle bin, and their citations (library of all family trees) */
  sources?: number;
  citations?: number;
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
  /** Family trees in which persons are their own ancestors – restored unchanged, only warned about */
  cycleTrees: string[];
  /** Current data in the database */
  current: BackupCounts;
  /** Size of the current media: the backup before the restore needs about as much space and time */
  currentMediaBytes: number;
}

export interface RestoreResult {
  counts: BackupCounts;
  missingFiles: number;
  /** Backup of the state before the restore (file name in the backup folder) */
  safetyBackup: string;
  backupDir: string;
}

/** Downloads the backup of all family trees, straight into the file (see `downloadChecked`) */
export async function downloadBackup(control?: ActivityControl): Promise<{
  filename: string;
  size: number;
  /** False if the user cancelled the "Save as" dialog of the app */
  saved: boolean;
  missingMedia: number;
  /** Set when the backup is larger than the optional limit for restoring (it is saved anyway) */
  overLimit: { sizeMb: number; limitMb: number } | null;
}> {
  const { check, saved } = await downloadChecked<DownloadCheck & { overLimit: { sizeMb: number; limitMb: number } | null }>('/api/v1/backup', control);
  return { filename: check.filename, size: check.size, saved, missingMedia: check.missingMedia, overLimit: check.overLimit };
}

const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Checks the backup and compares it with the current data – changes nothing; the file is uploaded once */
export async function previewBackup(file: File, control?: ActivityControl): Promise<BackupPreview> {
  const response = await withUpload('/api/v1/backup/upload', file, (uploadId) => request('/api/v1/backup/preview', json({ uploadId })), control);
  return response.json();
}

/** Replaces all data with the backup as a job of the backend, which saves the current state first */
export async function restoreBackup(file: File, control?: ActivityControl): Promise<RestoreResult> {
  const response = await withUpload(
    '/api/v1/backup/upload',
    file,
    (uploadId) => request('/api/v1/backup/restore', json({ uploadId, confirm: RESTORE_CONFIRMATION })),
    control,
  );
  const { jobId } = (await response.json()) as { jobId: string };
  return followJob<RestoreResult>(jobId, control);
}
