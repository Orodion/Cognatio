import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { assertFreeSpace } from '../../files/freeSpace.js';
import { stageLocalFile } from '../../files/stagedUploads.js';
import { bufferOutput, writeZipFile, type ZipOutput } from '../../files/zipWriter.js';
import { backupDir } from '../../systemInfo.js';
import { backupFileName, createBackup } from '../../backup/backup.js';
import { backupErrorAnswer, startRestoreJob } from '../../backup/restoreRun.js';
import { buildExport, createGedzip, createZip, exportFileName } from '../../transfer/exportData.js';
import { GEDCOM_VERSIONS, toGedcom } from '../../transfer/gedcom.js';
import { MAX_TREE_NAME, previewImport, startImportJob, transferErrorAnswer } from '../../transfer/importRun.js';
import { importLanguage } from '../../transfer/languageTexts.js';
import { backupMaxBytes, importMaxBytes } from '../../transfer/limits.js';
import { jobStatus, startJob, whenFree, type JobControl } from '../../transfer/jobs.js';
import { ensureFolder, readableFile, writableFolder, zipFilesIn } from '../../files/localFiles.js';
import { McpToolError, defineTool, id } from '../tool.js';

/** Writes an archive or a file into `target`, with progress and cancelling like a download of the page */
async function writeOutput(output: ZipOutput, target: string, job: JobControl) {
  const size = await output.size;
  await assertFreeSpace(path.dirname(target), size);
  job.phase('download', size);
  await writeZipFile(output, target, (bytes) => {
    job.advance(bytes);
    return job.cancelled();
  });
}

export const getJob = defineTool({
  name: 'get_job',
  title: 'State of a job',
  description: 'State and result of a long task started by export_family_tree, import_file, create_backup or restore_backup.',
  area: ['transfer', 'backup'],
  level: 'read',
  input: { jobId: id('Id the starting tool returned') },
  run: async ({ jobId }) => {
    const status = jobStatus(jobId);
    if (!status) {
      throw new McpToolError('JOB_NOT_FOUND', `No job ${jobId} (finished jobs are kept for 10 minutes).`);
    }
    return { data: status };
  },
});

export const listImports = defineTool({
  name: 'list_imports',
  title: 'List the imports',
  description: 'The previous imports into a family tree, newest first, with what they created.',
  area: 'transfer',
  level: 'read',
  inTree: true,
  input: {},
  run: async (_args, { gql }) => {
    const { importHistory } = await gql<{ importHistory: unknown[] }>(
      'query { importHistory { importedAt fileName kind source strategy createdPersons updatedPersons removedPersons createdRelations createdEvents createdMedia missingFiles } }',
    );
    return { data: importHistory };
  },
});

export const exportFamilyTree = defineTool({
  name: 'export_family_tree',
  title: 'Export a family tree',
  description:
    'Writes a family tree into a folder on this computer: ZIP (Cognatio, with media) or GEDCOM (5.5.1 or 7.0; with media as ZIP/GEDZIP). Runs as a job: the answer has the jobId for get_job; its result names the file.',
  area: 'transfer',
  level: 'read',
  inTree: true,
  input: {
    folder: z.string().min(1).max(1000).describe('Absolute path of an existing folder (home, data or backup folder)'),
    format: z.enum(['ZIP', 'GEDCOM']).optional().describe('Default ZIP'),
    gedcomVersion: z.enum(GEDCOM_VERSIONS).optional().describe('Default 5.5.1'),
    media: z.boolean().optional().describe('Include the media files (default: yes for ZIP, no for GEDCOM)'),
  },
  run: async ({ folder, format = 'ZIP', gedcomVersion = '5.5.1', media }, { tree }) => {
    const dir = writableFolder(folder);
    const treeId = tree!.id;
    const job = startJob(
      'export',
      (control) =>
        whenFree('export', control, async () => {
          const now = new Date();
          const { data, files } = await buildExport(prisma, treeId, now);
          const base = exportFileName(data, now);
          let output: ZipOutput;
          let name: string;
          let missing: string[] = [];
          if (format === 'ZIP') {
            ({ zip: output, missing } = createZip(data, files, media ?? true));
            name = `${base}.zip`;
          } else if (media) {
            ({ zip: output, missing } = createGedzip(data, files, gedcomVersion, now));
            name = `${base}_gedcom${gedcomVersion.replace('.', '')}.${gedcomVersion === '7.0' ? 'gdz' : 'zip'}`;
          } else {
            output = bufferOutput(Buffer.from(toGedcom(data, gedcomVersion, now)));
            name = `${base}_gedcom${gedcomVersion.replace('.', '')}.ged`;
          }
          const target = path.join(dir, name);
          try {
            await writeOutput(output, target, control);
          } finally {
            output.stream.destroy();
          }
          return { file: target, missingMedia: missing.length };
        }),
      (outcome) => ('result' in outcome ? { status: 200, body: outcome.result } : transferErrorAnswer(outcome.error, 'MCP export')),
      { label: tree!.name },
    );
    return { data: { jobId: job.id, hint: 'Ask get_job for the state; the result names the file.' }, target: tree!.name };
  },
});

export const importFile = defineTool({
  name: 'import_file',
  title: 'Import a file',
  description:
    'Imports a Cognatio ZIP or a GEDCOM file (.ged, .zip, .gdz) from this computer, as a new family tree or into an existing one. Call with previewOnly true first: it tells what the import would do. MERGE_NEWER adds new persons and takes newer data; OVERWRITE replaces the persons of the family tree (needs the permission "delete"). The preview answers right away; the import itself runs as a job (get_job).',
  area: 'transfer',
  level: 'write',
  inTree: true,
  input: {
    path: z.string().min(1).max(1000).describe('Absolute path of the file'),
    target: z.enum(['NEW', 'CURRENT']).describe('NEW: a new family tree; CURRENT: the family tree of the call'),
    strategy: z.enum(['MERGE_NEWER', 'OVERWRITE']).optional().describe('Default MERGE_NEWER'),
    treeName: z.string().max(MAX_TREE_NAME).optional().describe('Name of a new family tree; default: the most common last name'),
    previewOnly: z.boolean().optional(),
  },
  run: async ({ path: given, target, strategy = 'MERGE_NEWER', treeName, previewOnly }, { tree, can }) => {
    if (strategy === 'OVERWRITE' && !can('transfer', 'delete')) {
      throw new McpToolError('NOT_ALLOWED', 'The user has not allowed imports that overwrite a family tree (settings → MCP).');
    }
    const file = readableFile(given);
    const upload = await stageLocalFile('import', file, importMaxBytes());
    const treeId = target === 'NEW' ? null : tree!.id;
    const language = importLanguage(undefined);
    if (previewOnly) {
      const preview = await previewImport(upload, treeId, language);
      return {
        data: {
          kind: preview.kind,
          source: preview.source,
          exportedAt: preview.exportedAt,
          target: preview.target,
          suggestedTreeName: preview.suggestedTreeName,
          existingPersons: preview.existingPersons,
          importedPersons: preview.importedPersons,
          missingFiles: preview.missingFiles.length,
          conflicts: preview.conflicts.length,
          previousImports: preview.previousImports,
          result: { MERGE_NEWER: preview.summaries.MERGE_NEWER, OVERWRITE: preview.summaries.OVERWRITE },
          ownAncestors: { MERGE_NEWER: preview.cycles.MERGE_NEWER?.length ?? 0, OVERWRITE: preview.cycles.OVERWRITE?.length ?? 0 },
        },
      };
    }
    const job = startImportJob({ upload, strategy, decisions: {}, treeId, treeName: (treeName ?? '').trim(), language });
    return { data: { jobId: job.id, hint: 'Ask get_job for the state and the result.' }, target: path.basename(file) };
  },
});

export const listBackups = defineTool({
  name: 'list_backups',
  title: 'List the backups',
  description: 'Backups (ZIP) in the backup folder of the app, newest first.',
  area: 'backup',
  level: 'read',
  input: {},
  run: async () => {
    const dir = backupDir();
    const files = zipFilesIn(dir);
    return { data: { folder: dir, backups: files } };
  },
});

export const createBackupTool = defineTool({
  name: 'create_backup',
  title: 'Create a backup',
  description: 'Writes a backup of all family trees with their media into the backup folder of the app. Runs as a job (get_job).',
  area: 'backup',
  level: 'write',
  input: {},
  run: async () => {
    const job = startJob(
      'backup',
      (control) =>
        whenFree('backup', control, async () => {
          const now = new Date();
          const { zip, missing } = await createBackup(prisma, now);
          const dir = backupDir();
          ensureFolder(dir);
          const target = path.join(dir, backupFileName(now));
          try {
            await writeOutput(zip, target, control);
          } finally {
            zip.stream.destroy();
          }
          return { file: target, missingMedia: missing.length };
        }),
      (outcome) => ('result' in outcome ? { status: 200, body: outcome.result } : backupErrorAnswer(outcome.error, 'Backup')),
    );
    return { data: { jobId: job.id, hint: 'Ask get_job for the state; the result names the file.' } };
  },
});

export const restoreBackupTool = defineTool({
  name: 'restore_backup',
  title: 'Restore a backup',
  description:
    'Replaces ALL data of the app (all family trees, sources and media) by a backup file. The current state is saved into the backup folder first, as in the app. Cannot be undone otherwise. Runs as a job (get_job).',
  area: 'backup',
  level: 'delete',
  input: { path: z.string().min(1).max(1000).describe('Absolute path of the backup file (cognatio_backup_….zip)') },
  run: async ({ path: given }) => {
    const file = readableFile(given);
    const upload = await stageLocalFile('backup', file, backupMaxBytes());
    const job = startRestoreJob(upload);
    return { data: { jobId: job.id, hint: 'Ask get_job for the state and the result.' }, target: path.basename(file) };
  },
});

export const TRANSFER_TOOLS = [getJob, listImports, exportFamilyTree, importFile, listBackups, createBackupTool, restoreBackupTool];
