import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { backupDir } from '../systemInfo.js';
import { TransferError } from '../transfer/format.js';
import { startJob, whenFree, type JobAnswer, type JobControl } from '../transfer/jobs.js';
import { discardUpload, holdUpload, stagedUpload, type StagedUpload } from '../files/stagedUploads.js';
import { readBackup, restoreBackup, restoreBytes, writeSafetyBackup } from './backup.js';

/** The restore of a backup, shared by the page (routes/backupRoutes.ts) and by AI assistants (MCP) */
const log = logger.child({ component: 'backup' });

/** Answer for an error of a backup or restore: status and JSON body; technical details go to the log */
export function backupErrorAnswer(err: unknown, context: string): JobAnswer {
  if (err instanceof TransferError) {
    log.warn(`${context} rejected: ${err.reason}`, { reason: err.reason, details: err.details });
    const status = err.reason.endsWith('TOO_LARGE') || err.reason === 'NOT_ENOUGH_SPACE' ? 413 : err.reason === 'UPLOAD_NOT_FOUND' ? 410 : 400;
    return { status, body: { error: err.reason, reason: err.reason, details: err.details, params: err.params } };
  }
  log.error(`${context} failed`, { err });
  return { status: 500, body: { error: `${context} failed`, reason: context === 'Backup' ? 'BACKUP_FAILED' : 'RESTORE_FAILED' } };
}

/** The restore itself, as a job: check, save the current state, copy the media, replace the data */
export async function runRestore(job: JobControl, upload: StagedUpload) {
  // Check completely first – a faulty file must not touch the data
  const backup = await readBackup(upload.path);
  try {
    const now = new Date();
    // The current state is always saved completely; without this backup there is no restore
    let safetyBackup: string;
    try {
      // The media of the backup must fit as well: a lack of space shows before the long backup
      safetyBackup = await writeSafetyBackup(prisma, backupDir(), now, job, restoreBytes(backup));
    } catch (err) {
      if (err instanceof TransferError) {
        throw err;
      }
      log.error('Backup before the restore failed', { err, dir: backupDir() });
      throw new TransferError('SAFETY_BACKUP_FAILED', [backupDir()]);
    }
    const counts = await restoreBackup(prisma, backup, now, job);
    log.info('Backup restored', { createdAt: backup.manifest.createdAt, counts, missingFiles: backup.missingFiles.length, safetyBackup });
    return { counts, missingFiles: backup.missingFiles.length, safetyBackup, backupDir: backupDir() };
  } finally {
    backup.close();
  }
}

/** Starts the restore as a job; it waits for a running operation. The answer of the job is the one the route sends. */
export function startRestoreJob(upload: StagedUpload) {
  holdUpload(upload, true);
  return startJob(
    'restore',
    async (control) => {
      try {
        return await whenFree('restore', control, async () => {
          // A job that waited before this one may have used the file already
          stagedUpload('backup', upload.id);
          const result = await runRestore(control, upload);
          discardUpload(upload);
          return result;
        });
      } finally {
        holdUpload(upload, false);
      }
    },
    (outcome) => ('result' in outcome ? { status: 200, body: outcome.result } : backupErrorAnswer(outcome.error, 'Restore')),
  );
}
