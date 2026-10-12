import express from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { backupDir } from '../lib/systemInfo.js';
import { TransferError } from '../lib/transfer/format.js';
import { backupMaxBytes, toMb } from '../lib/transfer/limits.js';
import { oneAtATime } from '../lib/transfer/oneAtATime.js';
import { backupFileName, createBackup, currentCounts, describeBackup, readBackup, restoreBackup, writeSafetyBackup } from '../lib/backup/backup.js';

/**
 * Backup of all family trees (Settings → Backup). Unlike export/import it does not apply
 * to the active family tree but to all data.
 */
const router = express.Router();
const log = logger.child({ component: 'backup' });

/** Required field of the restore – prevents an accidental call from replacing all data */
export const RESTORE_CONFIRMATION = 'DELETE_ALL';

// Backups contain all media; the limit applies to restoring (a larger backup is still created, with a warning); adjustable in the settings or via BACKUP_MAX_MB
const storage = multer.memoryStorage();
const uploadFile: express.RequestHandler = (req, res, next) => multer({ storage, limits: { fileSize: backupMaxBytes() } }).single('file')(req, res, next);

function sendError(res: express.Response, err: unknown, context: string) {
  if (err instanceof TransferError) {
    log.warn(`${context} rejected: ${err.reason}`, { reason: err.reason, details: err.details });
    return res.status(err.reason.endsWith('TOO_LARGE') ? 413 : 400).json({ error: err.reason, reason: err.reason, details: err.details, params: err.params });
  }
  log.error(`${context} failed`, { err });
  return res.status(500).json({ error: `${context} failed`, reason: context === 'Backup' ? 'BACKUP_FAILED' : 'RESTORE_FAILED' });
}

const requireFile = (file: Express.Multer.File | undefined) => {
  if (!file) {
    throw new TransferError('NO_FILE');
  }
  return file;
};

router.get(
  '/backup',
  oneAtATime('backup', async (_req, res) => {
    try {
      const now = new Date();
      const { buffer, manifest, missing } = await createBackup(prisma, now);
      if (missing.length) {
        log.warn('Media files are missing and were skipped', { missing });
      }
      log.info('Backup created', { counts: manifest.counts, missingFiles: missing.length, bytes: buffer.length });
      res
        .setHeader('Content-Disposition', `attachment; filename="${backupFileName(now)}"`)
        .setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Missing-Media, X-Backup-Size-Mb, X-Backup-Limit-Mb')
        .setHeader('X-Missing-Media', String(missing.length));
      // Larger than a restore accepts: the backup is delivered anyway, the app warns
      if (buffer.length > backupMaxBytes()) {
        log.warn('Backup is larger than the limit for restoring it', { bytes: buffer.length, limitBytes: backupMaxBytes() });
        res.setHeader('X-Backup-Size-Mb', String(toMb(buffer.length))).setHeader('X-Backup-Limit-Mb', String(toMb(backupMaxBytes())));
      }
      res.type('application/zip').send(buffer);
    } catch (err) {
      sendError(res, err, 'Backup');
    }
  }),
);

/** Checks the backup completely and compares it with the current data – without changing anything */
router.post(
  '/backup/preview',
  oneAtATime(
    'backup check',
    async (req, res) => {
      try {
        const backup = readBackup(requireFile(req.file).buffer);
        res.json({ ...describeBackup(backup), current: await currentCounts(prisma) });
      } catch (err) {
        sendError(res, err, 'Check');
      }
    },
    uploadFile,
  ),
);

router.post(
  '/backup/restore',
  oneAtATime(
    'restore',
    async (req, res) => {
      try {
        if (req.body?.confirm !== RESTORE_CONFIRMATION) {
          throw new TransferError('RESTORE_NOT_CONFIRMED');
        }
        // Check completely first – a faulty file must not touch the data
        const backup = readBackup(requireFile(req.file).buffer);
        const now = new Date();
        // The current state is always saved; without this backup there is no restore
        let safetyBackup: string;
        try {
          safetyBackup = await writeSafetyBackup(prisma, backupDir(), now);
        } catch (err) {
          log.error('Backup before the restore failed', { err, dir: backupDir() });
          throw new TransferError('SAFETY_BACKUP_FAILED', [backupDir()]);
        }
        const counts = await restoreBackup(prisma, backup, now);
        log.info('Backup restored', {
          createdAt: backup.manifest.createdAt,
          counts,
          missingFiles: backup.missingFiles.length,
          safetyBackup,
        });
        res.json({ counts, missingFiles: backup.missingFiles.length, safetyBackup, backupDir: backupDir() });
      } catch (err) {
        sendError(res, err, 'Restore');
      }
    },
    uploadFile,
  ),
);

router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large', reason: 'TOO_LARGE', params: { limitMb: toMb(backupMaxBytes()) } });
  }
  next(err);
});

export default router;
