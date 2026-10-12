import { createHash } from 'crypto';
import express from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { buildExport, createGedzip, createZip, exportFileName, familyName } from '../lib/transfer/exportData.js';
import { TransferError } from '../lib/transfer/format.js';
import { GEDCOM_VERSIONS, toGedcom, type GedcomVersion } from '../lib/transfer/gedcom.js';
import { readImportFile } from '../lib/transfer/readImport.js';
import { importMaxBytes, toMb } from '../lib/transfer/limits.js';
import { oneAtATime } from '../lib/transfer/oneAtATime.js';
import { STRATEGIES, analyze, buildPlan, summarize, type Decision, type Strategy } from '../lib/transfer/plan.js';
import { applyPlan, type ApplyResult } from '../lib/transfer/applyPlan.js';
import { reconcileGedcom, type Recognition } from '../lib/transfer/reconcile.js';
import { logger } from '../lib/logger.js';
import { emptyTransfer, foreignIds, remapIds } from '../lib/transfer/foreignIds.js';
import { isTreeNotFound, requestedTree, resolveTree } from '../lib/treeScope.js';

const router = express.Router();
const exportLog = logger.child({ component: 'export' });
const importLog = logger.child({ component: 'import' });

// Import files are processed in memory; upper limit (and the one for exports) adjustable in the settings or via IMPORT_MAX_MB
const storage = multer.memoryStorage();
const uploadFile: express.RequestHandler = (req, res, next) => multer({ storage, limits: { fileSize: importMaxBytes() } }).single('file')(req, res, next);

const attachment = (res: express.Response, filename: string) =>
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`).setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Missing-Media');

/** Active family tree of the request (header or ?familyTree=) */
const activeTree = (req: express.Request) => resolveTree(prisma, requestedTree(req));

const MAX_TREE_NAME = 100;

router.get(
  '/export/zip',
  oneAtATime('export', async (req, res) => {
    try {
      const now = new Date();
      const { data, files } = await buildExport(prisma, await activeTree(req), now);
      const { buffer, missing } = createZip(data, files, req.query.media !== '0');
      if (missing.length) {
        exportLog.warn('Media files are missing and were skipped', { missing });
      }
      attachment(res, `${exportFileName(data, now)}.zip`);
      res.setHeader('X-Missing-Media', String(missing.length));
      res.type('application/zip').send(buffer);
    } catch (err) {
      if (isTreeNotFound(err)) {
        return res.status(404).json({ error: 'Family tree not found', reason: 'TREE_NOT_FOUND' });
      }
      if (err instanceof TransferError) {
        exportLog.warn(`ZIP export rejected: ${err.reason}`, { reason: err.reason, details: err.details });
        return res.status(413).json({ error: err.reason, reason: err.reason, details: err.details, params: err.params });
      }
      exportLog.error('ZIP export failed', { err });
      res.status(500).json({ error: 'Export failed', reason: 'EXPORT_FAILED' });
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
        const { buffer, missing } = createGedzip(data, files, version, now);
        if (missing.length) {
          exportLog.warn('Media files are missing and were skipped', { missing });
        }
        attachment(res, `${name}.${version === '7.0' ? 'gdz' : 'zip'}`);
        res.setHeader('X-Missing-Media', String(missing.length));
        res.type('application/zip').send(buffer);
        return;
      }
      attachment(res, `${name}.ged`);
      res.type('text/vnd.familysearch.gedcom; charset=utf-8').send(toGedcom(data, version, now));
    } catch (err) {
      if (isTreeNotFound(err)) {
        return res.status(404).json({ error: 'Family tree not found', reason: 'TREE_NOT_FOUND' });
      }
      if (err instanceof TransferError) {
        exportLog.warn(`GEDCOM export rejected: ${err.reason}`, { reason: err.reason, details: err.details });
        return res.status(413).json({ error: err.reason, reason: err.reason, details: err.details, params: err.params });
      }
      exportLog.error('GEDCOM export failed', { err, version: req.query.version });
      res.status(500).json({ error: 'Export failed', reason: 'EXPORT_FAILED' });
    }
  }),
);

/** Target of the import: the active family tree or a new one (field `target` = "NEW") */
async function importTarget(req: express.Request): Promise<string | null> {
  return req.body?.target === 'NEW' ? null : activeTree(req);
}

/**
 * Reads the import file and compares it with the data of the target family tree (empty for a new one).
 * GEDCOM persons are first matched with known persons (identifier or name and birth year) so
 * nothing is created twice. Ids already taken in another family tree are assigned anew.
 */
async function prepareImport(file: Express.Multer.File | undefined, treeId: string | null) {
  if (!file) {
    throw new TransferError('NO_FILE');
  }
  const imported = readImportFile(file.buffer, file.originalname);
  const existing = treeId ? (await buildExport(prisma, treeId)).data : emptyTransfer();
  let recognized: Recognition | null = null;
  if (imported.kind === 'GEDCOM' && treeId) {
    const reconciled = reconcileGedcom(imported.data, existing);
    imported.data = reconciled.data;
    recognized = reconciled.recognized;
  }
  imported.data = remapIds(imported.data, await foreignIds(prisma, imported.data, existing));
  const fileHash = createHash('sha256').update(file.buffer).digest('hex');
  // Suggested name for a new family tree: most common last name, otherwise the file name
  const suggestedTreeName = (familyName(imported.data) ?? file.originalname.replace(/\.[^.]+$/, '')).slice(0, MAX_TREE_NAME);
  return { imported, recognized, fileHash, suggestedTreeName, analysis: analyze(imported.data, existing) };
}

/** Earlier imports of the same file (same content) into the target family tree or at all, newest first */
const previousImports = (fileHash: string, treeId: string | null) =>
  prisma.importRecord.findMany({
    where: { fileHash, ...(treeId ? { familyTreeId: treeId } : {}) },
    orderBy: { importedAt: 'desc' },
    take: 3,
    select: { importedAt: true, strategy: true, fileName: true },
  });

/** Entry in the import history; an error here does not undo the (already completed) import */
async function recordImport(entry: {
  file: Express.Multer.File;
  fileHash: string;
  kind: string;
  source: string | null;
  exportedAt: string;
  strategy: string;
  recognized: Recognition | null;
  result: ApplyResult;
}) {
  try {
    await prisma.importRecord.create({
      data: {
        familyTreeId: entry.result.familyTreeId,
        fileName: entry.file.originalname,
        fileHash: entry.fileHash,
        kind: entry.kind,
        source: entry.source,
        exportedAt: new Date(entry.exportedAt),
        strategy: entry.strategy,
        createdPersons: entry.result.createdPersons,
        updatedPersons: entry.result.updatedPersons,
        removedPersons: entry.result.removedPersons,
        recognizedPersons: entry.recognized ? entry.recognized.byId + entry.recognized.byName : 0,
        createdRelations: entry.result.createdRelations,
        createdEvents: entry.result.createdEvents,
        createdNotes: entry.result.createdNotes,
        createdMedia: entry.result.createdMedia,
        missingFiles: entry.result.missingFiles.length,
      },
    });
  } catch (err) {
    importLog.error('Import could not be recorded in the history', { err });
  }
}

function sendError(res: express.Response, err: unknown, context: string) {
  if (isTreeNotFound(err)) {
    return res.status(404).json({ error: 'Family tree not found', reason: 'TREE_NOT_FOUND' });
  }
  if (err instanceof TransferError) {
    // Technical details go to the log, plus a short list for display
    importLog.warn(`${context} rejected: ${err.reason}`, { reason: err.reason, details: err.details });
    return res.status(err.reason.endsWith('TOO_LARGE') ? 413 : 400).json({ error: err.reason, reason: err.reason, details: err.details, params: err.params });
  }
  importLog.error(`${context} failed`, { err });
  return res.status(500).json({ error: 'Import failed', reason: 'IMPORT_FAILED' });
}

router.post(
  '/import/preview',
  oneAtATime(
    'import check',
    async (req, res) => {
      try {
        const treeId = await importTarget(req);
        const { imported, analysis, recognized, fileHash, suggestedTreeName } = await prepareImport(req.file, treeId);
        const referenced = imported.data.persons.flatMap((p) => p.media.map((m) => m.path));
        res.json({
          kind: imported.kind,
          source: imported.data.source ?? null,
          exportedAt: imported.data.exportedAt,
          recognized,
          target: treeId ? 'CURRENT' : 'NEW',
          suggestedTreeName,
          previousImports: await previousImports(fileHash, treeId),
          existingPersons: analysis.existingPersons,
          importedPersons: analysis.importedPersons,
          missingFiles: imported.kind === 'ZIP' ? referenced.filter((p) => !imported.files.has(p)) : [],
          conflicts: analysis.conflicts,
          summaries: Object.fromEntries(STRATEGIES.map((s) => [s, summarize(analysis, buildPlan(imported.data, analysis, s))])),
        });
      } catch (err) {
        sendError(res, err, 'Preview');
      }
    },
    uploadFile,
  ),
);

router.post(
  '/import/execute',
  oneAtATime(
    'import',
    async (req, res) => {
      try {
        const strategy = req.body.strategy as Strategy;
        if (!STRATEGIES.includes(strategy)) {
          throw new TransferError('INVALID_STRATEGY', [String(strategy)]);
        }
        let decisions: Record<string, Decision> = {};
        try {
          decisions = req.body.decisions ? JSON.parse(req.body.decisions) : {};
        } catch {
          throw new TransferError('INVALID_DECISIONS');
        }
        const treeId = await importTarget(req);
        const { imported, analysis, recognized, fileHash, suggestedTreeName } = await prepareImport(req.file, treeId);
        const plan = buildPlan(imported.data, analysis, strategy, decisions);
        const treeName =
          String(req.body.treeName ?? '')
            .trim()
            .slice(0, MAX_TREE_NAME) || suggestedTreeName;
        const result = await applyPlan(prisma, plan, imported.files, treeId ? { treeId } : { newTreeName: treeName });
        await recordImport({
          file: req.file!,
          fileHash,
          kind: imported.kind,
          source: imported.data.source ?? null,
          exportedAt: imported.data.exportedAt,
          strategy,
          recognized,
          result,
        });
        importLog.info(`${imported.kind} file imported`, {
          kind: imported.kind,
          exportedAt: imported.data.exportedAt,
          strategy,
          ...result,
          missingFiles: result.missingFiles.length,
        });
        res.json({ ...result, summary: summarize(analysis, plan) });
      } catch (err) {
        sendError(res, err, 'Import');
      }
    },
    uploadFile,
  ),
);

// Report files that are too large (multer) with an understandable reason
router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large', reason: 'TOO_LARGE', params: { limitMb: toMb(importMaxBytes()) } });
  }
  next(err);
});

export default router;
