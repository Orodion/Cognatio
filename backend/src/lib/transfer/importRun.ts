import { prisma } from '../prisma.js';
import { logger, type Logger } from '../logger.js';
import { buildExport, familyName } from './exportData.js';
import { FORMAT_VERSION_PLAIN, TransferError } from './format.js';
import { readImportFile, type ImportFile } from './readImport.js';
import type { ImportLanguage } from './languageTexts.js';
import { startJob, whenFree, type JobAnswer, type JobControl } from './jobs.js';
import { discardUpload, holdUpload, stagedUpload, type StagedUpload } from '../files/stagedUploads.js';
import { STRATEGIES, analyze, buildPlan, planCycles, summarize, type Decision, type Strategy } from './plan.js';
import { applyPlan, type ApplyResult } from './applyPlan.js';
import { reconcileGedcom, type Recognition } from './reconcile.js';
import { emptyTransfer, foreignIds, remapIds } from './foreignIds.js';
import { keepExistingLinks, loadLibrary, reconcileLibrary } from './library.js';
import { isTreeNotFound } from '../treeScope.js';

/**
 * Preview and execution of an import, shared by the page (routes/transferRoutes.ts) and by AI assistants (MCP): the
 * file was staged before (an upload of the page or a file on this computer).
 */
const importLog = logger.child({ component: 'import' });

export const MAX_TREE_NAME = 100;

/** Answer for an error of an export or import: status and JSON body; technical details go to the log */
export function transferErrorAnswer(err: unknown, context: string, log: Logger = importLog): JobAnswer {
  if (isTreeNotFound(err)) {
    return { status: 404, body: { error: 'Family tree not found', reason: 'TREE_NOT_FOUND' } };
  }
  if (err instanceof TransferError) {
    log.warn(`${context} rejected: ${err.reason}`, { reason: err.reason, details: err.details });
    const status = err.reason.endsWith('TOO_LARGE') || err.reason === 'NOT_ENOUGH_SPACE' ? 413 : err.reason === 'UPLOAD_NOT_FOUND' ? 410 : 400;
    return { status, body: { error: err.reason, reason: err.reason, details: err.details, params: err.params } };
  }
  log.error(`${context} failed`, { err });
  return { status: 500, body: { error: `${context} failed`, reason: context.includes('export') ? 'EXPORT_FAILED' : 'IMPORT_FAILED' } };
}

/**
 * Reads the uploaded import file and compares it with the data of the target family tree (empty for a new one).
 * GEDCOM persons are first matched with known persons (identifier or name and birth year) so nothing is created
 * twice. Ids already taken in another family tree are assigned anew. Archives, sources and citations are matched with
 * the library (shared by all family trees). The caller closes `imported`.
 */
export async function prepareImport(upload: StagedUpload, treeId: string | null, language: ImportLanguage) {
  const imported: ImportFile = await readImportFile(upload.path, upload.originalName, language);
  try {
    const existing = treeId ? (await buildExport(prisma, treeId)).data : emptyTransfer();
    let recognized: Recognition | null = null;
    if (imported.kind === 'GEDCOM' && treeId) {
      const reconciled = reconcileGedcom(imported.data, existing);
      imported.data = reconciled.data;
      recognized = reconciled.recognized;
    }
    // A file that knows no citations (GEDCOM, export of version 1) keeps the links of the existing records
    if (imported.kind === 'GEDCOM' || imported.data.version === FORMAT_VERSION_PLAIN) {
      imported.data = keepExistingLinks(imported.data, existing);
    }
    imported.data = remapIds(imported.data, await foreignIds(prisma, imported.data, existing));
    const library = await loadLibrary(prisma, imported.data);
    imported.data = await reconcileLibrary(imported.data, library);
    const known = await loadLibrary(prisma, imported.data);
    // Suggested name for a new family tree: most common last name, otherwise the file name
    const suggestedTreeName = (familyName(imported.data) ?? upload.originalName.replace(/\.[^.]+$/, '')).slice(0, MAX_TREE_NAME);
    return { imported, existing, recognized, suggestedTreeName, analysis: analyze(imported.data, existing, known.state) };
  } catch (err) {
    imported.close();
    throw err;
  }
}

/** Earlier imports of the same file (same content) into the target family tree or at all, newest first */
export const previousImports = (fileHash: string, treeId: string | null) =>
  prisma.importRecord.findMany({
    where: { fileHash, ...(treeId ? { familyTreeId: treeId } : {}) },
    orderBy: { importedAt: 'desc' },
    take: 3,
    select: { importedAt: true, strategy: true, fileName: true },
  });

/** Entry in the import history; an error here does not undo the (already completed) import */
async function recordImport(entry: {
  upload: StagedUpload;
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
        fileName: entry.upload.originalName,
        fileHash: entry.upload.sha256,
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

/** The import itself, as a job: copy the media, then change the database in one transaction */
export async function runImport(
  job: JobControl,
  upload: StagedUpload,
  strategy: Strategy,
  decisions: Record<string, Decision>,
  treeId: string | null,
  treeName: string,
  language: ImportLanguage,
) {
  const { imported, existing, analysis, recognized, suggestedTreeName } = await prepareImport(upload, treeId, language);
  try {
    const plan = buildPlan(imported.data, analysis, strategy, decisions);
    const cycles = planCycles(imported.data, existing, plan);
    const result = await applyPlan(prisma, plan, imported.files, treeId ? { treeId } : { newTreeName: treeName || suggestedTreeName }, job);
    await recordImport({
      upload,
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
    if (cycles.length) {
      // Imported anyway – the preview named the persons concerned
      importLog.warn('Imported data contains persons who are their own ancestors', { cycles: cycles.length });
    }
    return { ...result, summary: summarize(analysis, plan) };
  } finally {
    imported.close();
  }
}

/** What the page shows before an import: kind and origin of the file, conflicts and the result of each strategy */
export async function previewImport(upload: StagedUpload, treeId: string | null, language: ImportLanguage) {
  const { imported, existing, analysis, recognized, suggestedTreeName } = await prepareImport(upload, treeId, language);
  try {
    const plans = STRATEGIES.map((s) => [s, buildPlan(imported.data, analysis, s)] as const);
    const referenced = [...imported.data.persons.flatMap((p) => p.media), ...imported.data.libraryMedia].map((m) => m.path);
    return {
      kind: imported.kind,
      source: imported.data.source ?? null,
      exportedAt: imported.data.exportedAt,
      recognized,
      target: treeId ? 'CURRENT' : 'NEW',
      suggestedTreeName,
      previousImports: await previousImports(upload.sha256, treeId),
      existingPersons: analysis.existingPersons,
      importedPersons: analysis.importedPersons,
      missingFiles: imported.kind === 'ZIP' ? referenced.filter((p) => !imported.files.has(p)) : [],
      conflicts: analysis.conflicts,
      summaries: Object.fromEntries(plans.map(([s, plan]) => [s, summarize(analysis, plan)])),
      // Persons that would be their own ancestors afterwards (manual merging: before any decision)
      cycles: Object.fromEntries(plans.map(([s, plan]) => [s, planCycles(imported.data, existing, plan)])),
    };
  } finally {
    imported.close();
  }
}

/** An import that is to run: the staged file, the strategy and where it goes (`treeId` null: a new family tree) */
export interface ImportRequest {
  upload: StagedUpload;
  strategy: Strategy;
  decisions: Record<string, Decision>;
  treeId: string | null;
  treeName: string;
  language: ImportLanguage;
}

/** Starts the import as a job; it waits for a running operation. The answer of the job is the one the route sends. */
export function startImportJob(request: ImportRequest) {
  const { upload } = request;
  holdUpload(upload, true);
  return startJob(
    'import',
    async (control) => {
      try {
        return await whenFree('import', control, async () => {
          // A job that waited before this one may have used the file already
          stagedUpload('import', upload.id);
          const result = await runImport(control, upload, request.strategy, request.decisions, request.treeId, request.treeName, request.language);
          discardUpload(upload);
          return result;
        });
      } finally {
        holdUpload(upload, false);
      }
    },
    (outcome) => ('result' in outcome ? { status: 200, body: outcome.result } : transferErrorAnswer(outcome.error, 'Import')),
  );
}
