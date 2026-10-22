import express from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { TransferError } from '../lib/transfer/format.js';
import { backupMaxBytes, toMb } from '../lib/transfer/limits.js';
import { oneAtATime } from '../lib/transfer/oneAtATime.js';
import type { JobAnswer } from '../lib/transfer/jobs.js';
import { backupErrorAnswer as errorAnswer, startRestoreJob } from '../lib/backup/restoreRun.js';
import { receiveFile, stageUpload, stagedUpload, stagingDir } from '../lib/files/stagedUploads.js';
import { enoughSpaceFor } from '../lib/files/freeSpace.js';
import { sendAsJob } from '../lib/transfer/downloadJob.js';
import { backupFileName, createBackup, currentCounts, describeBackup, readBackup } from '../lib/backup/backup.js';

/**
 * Backup of all family trees (Settings → Backup). Unlike export/import it does not apply
 * to the active family tree but to all data.
 */
const router = express.Router();
const log = logger.child({ component: 'backup' });

/** Required field of the restore – prevents an accidental call from replacing all data */
export const RESTORE_CONFIRMATION = 'DELETE_ALL';

const EXPOSED = 'Content-Disposition, X-Missing-Media, X-Backup-Size-Mb, X-Backup-Limit-Mb';

const send = (res: express.Response, answer: JobAnswer) => res.status(answer.status).json(answer.body);

/**
 * The backup as a download, written while it is sent. With `?check=1` only file name, size and the missing media
 * are answered (JSON), so the page can warn before the download starts. A backup larger than the optional limit for
 * restoring is delivered anyway; the page warns.
 */
router.get(
  '/backup',
  oneAtATime('backup', async (req, res) => {
    try {
      const now = new Date();
      const { zip, manifest, missing } = await createBackup(prisma, now);
      const size = await zip.size;
      const limit = backupMaxBytes();
      const overLimit = size > limit ? { sizeMb: toMb(size), limitMb: toMb(limit) } : null;
      const filename = backupFileName(now);
      if (req.query.check === '1') {
        zip.stream.destroy();
        res.json({ filename, size, missingMedia: missing.length, overLimit });
        return;
      }
      if (missing.length) {
        log.warn('Media files are missing and were skipped', { missing });
      }
      if (overLimit) {
        log.warn('Backup is larger than the limit for restoring it', { bytes: size, limitBytes: limit });
        res.setHeader('X-Backup-Size-Mb', String(overLimit.sizeMb)).setHeader('X-Backup-Limit-Mb', String(overLimit.limitMb));
      }
      res.setHeader('Access-Control-Expose-Headers', EXPOSED).setHeader('X-Missing-Media', String(missing.length));
      const sent = await sendAsJob(req, res, 'backup', filename, zip, {
        result: { missingMedia: missing.length, overLimit },
        failed: (error) => errorAnswer(error, 'Backup'),
      });
      if (sent) {
        log.info('Backup sent', { counts: manifest.counts, missingFiles: missing.length, bytes: size });
      }
    } catch (err) {
      send(res, errorAnswer(err, 'Backup'));
    }
  }),
);

/** Receives the backup file once; preview and restore refer to it by `uploadId` */
router.post(
  '/backup/upload',
  enoughSpaceFor(stagingDir),
  (req, res, next) => receiveFile('backup', backupMaxBytes())(req, res, next),
  (req, res) => {
    try {
      const upload = stageUpload('backup', req.file);
      log.info('Backup file received', { size: upload.size });
      res.status(201).json({ uploadId: upload.id, size: upload.size });
    } catch (err) {
      send(res, errorAnswer(err, 'Upload'));
    }
  },
);

/** Checks the backup completely and compares it with the current data – without changing anything */
router.post(
  '/backup/preview',
  express.json(),
  oneAtATime('backup check', async (req, res) => {
    try {
      const backup = await readBackup(stagedUpload('backup', req.body?.uploadId).path);
      try {
        // The backup before the restore copies the current media: the page names the size when it is large
        const media = await prisma.media.aggregate({ _sum: { sizeBytes: true } });
        res.json({ ...describeBackup(backup), current: await currentCounts(prisma), currentMediaBytes: Number(media._sum.sizeBytes ?? 0) });
      } finally {
        backup.close();
      }
    } catch (err) {
      send(res, errorAnswer(err, 'Check'));
    }
  }),
);

/** Starts the restore and answers at once with the job (202); the page follows it under /jobs/:id. The job waits for a running operation. */
router.post('/backup/restore', express.json(), async (req, res) => {
  let job: { id: string; finished: Promise<void> };
  try {
    if (req.body?.confirm !== RESTORE_CONFIRMATION) {
      throw new TransferError('RESTORE_NOT_CONFIRMED');
    }
    const upload = stagedUpload('backup', req.body?.uploadId);
    job = startRestoreJob(upload);
  } catch (err) {
    send(res, errorAnswer(err, 'Restore'));
    return;
  }
  res.status(202).json({ jobId: job.id });
});

router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large', reason: 'TOO_LARGE', params: { limitMb: toMb(backupMaxBytes()) } });
  }
  next(err);
});

export default router;
