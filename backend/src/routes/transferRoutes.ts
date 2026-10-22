import express from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { buildExport, createGedzip, createZip, exportFileName } from '../lib/transfer/exportData.js';
import { TransferError } from '../lib/transfer/format.js';
import { GEDCOM_VERSIONS, toGedcom, type GedcomVersion } from '../lib/transfer/gedcom.js';
import { importLanguage } from '../lib/transfer/languageTexts.js';
import { importMaxBytes, toMb } from '../lib/transfer/limits.js';
import { oneAtATime } from '../lib/transfer/oneAtATime.js';
import type { JobAnswer } from '../lib/transfer/jobs.js';
import { receiveFile, stageUpload, stagedUpload, stagingDir } from '../lib/files/stagedUploads.js';
import { enoughSpaceFor } from '../lib/files/freeSpace.js';
import { bufferOutput, type ZipOutput } from '../lib/files/zipWriter.js';
import { sendAsJob } from '../lib/transfer/downloadJob.js';
import { STRATEGIES, type Decision, type Strategy } from '../lib/transfer/plan.js';
import { MAX_TREE_NAME, previewImport, startImportJob, transferErrorAnswer } from '../lib/transfer/importRun.js';
import { logger } from '../lib/logger.js';
import { requestedTree, resolveTree } from '../lib/treeScope.js';

const router = express.Router();
const exportLog = logger.child({ component: 'export' });
const importLog = logger.child({ component: 'import' });

const EXPOSED = 'Content-Disposition, X-Missing-Media';

// The decisions of a manual merge can be many (one per person)
const json = express.json({ limit: '20mb' });

/** Active family tree of the request (header or ?familyTree=) */
const activeTree = (req: express.Request) => resolveTree(prisma, requestedTree(req));

const errorAnswer = (err: unknown, context: string, log = importLog) => transferErrorAnswer(err, context, log);

const send = (res: express.Response, answer: JobAnswer) => res.status(answer.status).json(answer.body);

/**
 * An export as a download, written while it is sent; the page follows it as a job (`?activity=`). With `?check=1`
 * only the file name, the size and the missing media are answered (JSON): the page learns about errors before the
 * download starts, which it cannot read.
 */
async function sendExport(
  req: express.Request,
  res: express.Response,
  filename: string,
  output: ZipOutput,
  missing: string[],
  kind: string,
  contentType?: string,
) {
  if (missing.length) {
    exportLog.warn('Media files are missing and were skipped', { missing });
  }
  if (req.query.check === '1') {
    const size = await output.size;
    output.stream.destroy();
    res.json({ filename, size, missingMedia: missing.length });
    return;
  }
  res.setHeader('Access-Control-Expose-Headers', EXPOSED).setHeader('X-Missing-Media', String(missing.length));
  const sent = await sendAsJob(req, res, 'export', filename, output, {
    contentType,
    result: { missingMedia: missing.length },
    failed: (error) => errorAnswer(error, `${kind} export`, exportLog),
  });
  if (sent) {
    exportLog.info(`${kind} export sent`, { filename, missingMedia: missing.length });
  }
}

router.get(
  '/export/zip',
  oneAtATime('export', async (req, res) => {
    try {
      const now = new Date();
      const { data, files } = await buildExport(prisma, await activeTree(req), now);
      const { zip, missing } = createZip(data, files, req.query.media !== '0');
      await sendExport(req, res, `${exportFileName(data, now)}.zip`, zip, missing, 'ZIP');
    } catch (err) {
      send(res, errorAnswer(err, 'ZIP export', exportLog));
    }
  }),
);

router.get(
  '/export/gedcom',
  oneAtATime('export', async (req, res) => {
    try {
      const version = (GEDCOM_VERSIONS as readonly string[]).includes(String(req.query.version)) ? (req.query.version as GedcomVersion) : '5.5.1';
      const now = new Date();
      const { data, files } = await buildExport(prisma, await activeTree(req), now);
      const name = `${exportFileName(data, now)}_gedcom${version.replace('.', '')}`;
      if (req.query.media === '1') {
        // With media: GEDZIP (.gdz, GEDCOM 7) or a ZIP file with gedcom.ged and the media files
        const { zip, missing } = createGedzip(data, files, version, now);
        await sendExport(req, res, `${name}.${version === '7.0' ? 'gdz' : 'zip'}`, zip, missing, 'GEDZIP');
        return;
      }
      const text = bufferOutput(Buffer.from(toGedcom(data, version, now)));
      await sendExport(req, res, `${name}.ged`, text, [], 'GEDCOM', 'text/vnd.familysearch.gedcom; charset=utf-8');
    } catch (err) {
      send(res, errorAnswer(err, 'GEDCOM export', exportLog));
    }
  }),
);

/** Target of the import: the active family tree or a new one (field `target` = "NEW") */
async function importTarget(req: express.Request): Promise<string | null> {
  return req.body?.target === 'NEW' ? null : activeTree(req);
}

/** Receives the import file once; preview and execution refer to it by `uploadId` */
router.post(
  '/import/upload',
  enoughSpaceFor(stagingDir),
  (req, res, next) => receiveFile('import', importMaxBytes())(req, res, next),
  (req, res) => {
    try {
      const upload = stageUpload('import', req.file);
      importLog.info('Import file received', { size: upload.size });
      res.status(201).json({ uploadId: upload.id, size: upload.size });
    } catch (err) {
      send(res, errorAnswer(err, 'Upload'));
    }
  },
);

router.post(
  '/import/preview',
  json,
  oneAtATime('import check', async (req, res) => {
    try {
      const upload = stagedUpload('import', req.body?.uploadId);
      const treeId = await importTarget(req);
      res.json(await previewImport(upload, treeId, importLanguage(req.body?.language)));
    } catch (err) {
      send(res, errorAnswer(err, 'Preview'));
    }
  }),
);

/** Starts the import and answers at once with the job (202); the page follows it under /jobs/:id. The job waits for a running operation. */
router.post('/import/execute', json, async (req, res) => {
  let job: { id: string; finished: Promise<void> };
  try {
    const strategy = req.body?.strategy as Strategy;
    if (!STRATEGIES.includes(strategy)) {
      throw new TransferError('INVALID_STRATEGY', [String(strategy)]);
    }
    const decisions = req.body?.decisions ?? {};
    if (typeof decisions !== 'object' || Array.isArray(decisions)) {
      throw new TransferError('INVALID_DECISIONS');
    }
    const upload = stagedUpload('import', req.body?.uploadId);
    const treeId = await importTarget(req);
    const treeName = String(req.body?.treeName ?? '')
      .trim()
      .slice(0, MAX_TREE_NAME);
    const language = importLanguage(req.body?.language);
    job = startImportJob({ upload, strategy, decisions: decisions as Record<string, Decision>, treeId, treeName, language });
  } catch (err) {
    send(res, errorAnswer(err, 'Import'));
    return;
  }
  res.status(202).json({ jobId: job.id });
});

// Report files that are too large (multer) with an understandable reason
router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large', reason: 'TOO_LARGE', params: { limitMb: toMb(importMaxBytes()) } });
  }
  next(err);
});

export default router;
