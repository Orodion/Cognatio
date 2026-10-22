import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-mcp-files-'));
const mockUploads = path.join(mockDir, 'uploads');
const mockHome = path.join(mockDir, 'home');
fs.mkdirSync(mockUploads);
fs.mkdirSync(mockHome);
process.env.SETTINGS_FILE = path.join(mockDir, 'settings.json');
process.env.BACKUP_DIR = path.join(mockDir, 'backups');

jest.mock('node:os', () => ({ ...jest.requireActual('node:os'), homedir: () => mockHome }));
jest.mock('../../logger.js', () => {
  const actual = jest.requireActual('../../logger.js');
  return { ...actual, logger: new actual.Logger({ level: 'error', console: 'off', file: null }) };
});
jest.mock('../../prisma.js', () => ({ prisma: {} }));
jest.mock('../../files/uploads.js', () => ({ uploadDir: mockUploads, ensureUploadDir: jest.fn(), removeTempFile: jest.fn() }));
jest.mock('../../files/freeSpace.js', () => ({ assertFreeSpace: jest.fn(async () => undefined) }));
jest.mock('../../files/storeMedia.js', () => ({
  MEDIA_TYPES: ['PROFILE_PICTURE', 'PHOTO', 'DOCUMENT', 'OTHER'],
  storeMedia: jest.fn(),
}));
jest.mock('../../transfer/exportData.js', () => ({
  buildExport: jest.fn(async () => ({ data: { persons: [] }, files: [] })),
  exportFileName: () => 'cognatio_Kraft_20261021',
  createZip: jest.fn(() => ({ zip: { stream: Readable.from([Buffer.from('zip')]), size: Promise.resolve(3) }, missing: ['a.jpg'] })),
  createGedzip: jest.fn(() => ({ zip: { stream: Readable.from([Buffer.from('gdz')]), size: Promise.resolve(3) }, missing: [] })),
}));
jest.mock('../../transfer/gedcom.js', () => ({ GEDCOM_VERSIONS: ['5.5.1', '7.0'], toGedcom: () => '0 HEAD\n0 TRLR\n' }));
jest.mock('../../transfer/importRun.js', () => ({
  MAX_TREE_NAME: 100,
  previewImport: jest.fn(async () => ({
    kind: 'GEDCOM',
    source: 'Ahnen',
    exportedAt: '2026-01-01',
    target: 'NEW',
    suggestedTreeName: 'Kraft',
    existingPersons: 0,
    importedPersons: 12,
    missingFiles: [],
    conflicts: [],
    previousImports: [],
    summaries: { MERGE_NEWER: { create: 12 }, OVERWRITE: { create: 12 }, MERGE_MANUAL: {} },
    cycles: { MERGE_NEWER: [], OVERWRITE: [] },
  })),
  startImportJob: jest.fn(() => ({ id: 'job-import', finished: Promise.resolve() })),
  transferErrorAnswer: () => ({ status: 500, body: {} }),
}));
jest.mock('../../backup/backup.js', () => ({
  backupFileName: () => 'cognatio_backup_20261021_100000.zip',
  createBackup: jest.fn(async () => ({ zip: { stream: Readable.from([Buffer.from('backup')]), size: Promise.resolve(6) }, missing: [] })),
}));
jest.mock('../../backup/restoreRun.js', () => ({
  startRestoreJob: jest.fn(() => ({ id: 'job-restore', finished: Promise.resolve() })),
  backupErrorAnswer: () => ({ status: 500, body: {} }),
}));

import { storeMedia } from '../../files/storeMedia.js';
import { previewImport, startImportJob } from '../../transfer/importRun.js';
import { startRestoreJob } from '../../backup/restoreRun.js';
import { jobStatus } from '../../transfer/jobs.js';
import { addMedia, listMedia, removeMedia } from '../tools/media.js';
import { createBackupTool, exportFamilyTree, getJob, importFile, listBackups, restoreBackupTool } from '../tools/transfer.js';
import { allows, readOnlyPermissions, type McpPermissions } from '../permissions.js';
import type { AnyTool, Gql, ToolContext } from '../tool.js';

const context = (gql: Gql = jest.fn() as never, permissions: McpPermissions = readOnlyPermissions()): ToolContext => ({
  gql,
  tree: { id: 'tree-1', name: 'Kraft' },
  can: (area, level) => allows(permissions, area, level),
  trees: async () => [{ id: 'tree-1', name: 'Kraft' }],
});

const run = (tool: AnyTool, args: Record<string, unknown>, ctx = context()) => tool.run(args as never, ctx);

/** Waits for the job and returns its state */
async function finished(jobId: string) {
  for (let i = 0; i < 100 && jobStatus(jobId)?.state === 'running'; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return jobStatus(jobId);
}

afterAll(() => fs.rmSync(mockDir, { recursive: true, force: true }));

describe('media', () => {
  it('copies a file of the home folder into the upload folder and records it', async () => {
    const scan = path.join(mockHome, 'Taufe.JPG');
    fs.writeFileSync(scan, 'bild');
    jest.mocked(storeMedia).mockResolvedValueOnce({
      status: 201,
      body: { id: 'm1', originalFileName: 'Taufe.JPG', mimeType: 'image/jpeg', type: 'PHOTO', sizeBytes: 4, personId: null },
    });
    const result = await run(addMedia, { path: scan, eventId: 'e1', type: 'PHOTO' });
    const [file, target] = jest.mocked(storeMedia).mock.calls[0];
    expect(file).toMatchObject({ originalname: 'Taufe.JPG', mimetype: 'image/jpeg', size: 4 });
    expect(file.filename).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(fs.readFileSync(file.path, 'utf8')).toBe('bild');
    expect(target).toEqual({ eventId: 'e1', type: 'PHOTO' });
    expect(result).toMatchObject({ data: { id: 'm1' }, target: 'Taufe.JPG' });
    // The original stays
    expect(fs.existsSync(scan)).toBe(true);
  });

  it('passes a refusal of the app on and needs a target', async () => {
    const scan = path.join(mockHome, 'brief.pdf');
    fs.writeFileSync(scan, 'pdf');
    jest.mocked(storeMedia).mockResolvedValueOnce({ status: 409, body: { error: 'Person is in the recycle bin', reason: 'PERSON_IN_TRASH' } });
    await expect(run(addMedia, { path: scan, personId: 'p1' })).rejects.toMatchObject({ reason: 'PERSON_IN_TRASH' });
    await expect(run(addMedia, { path: scan })).rejects.toMatchObject({ reason: 'BAD_INPUT' });
  });

  it('takes an image without a type as a photo and any other file as a document, like the app', async () => {
    const photo = path.join(mockHome, 'hof.png');
    const letter = path.join(mockHome, 'brief.txt');
    fs.writeFileSync(photo, 'png');
    fs.writeFileSync(letter, 'text');
    jest.mocked(storeMedia).mockResolvedValue({ status: 201, body: { id: 'm2', originalFileName: 'x' } });

    await run(addMedia, { path: photo, personId: 'p1' });
    await run(addMedia, { path: letter, personId: 'p1' });

    const types = jest
      .mocked(storeMedia)
      .mock.calls.slice(-2)
      .map(([, target]) => target.type);
    expect(types).toEqual(['PHOTO', 'DOCUMENT']);
  });

  it('refuses files outside the allowed folders', async () => {
    const outside = path.join(os.tmpdir(), `cognatio-fremd-${process.pid}.jpg`);
    fs.writeFileSync(outside, 'x');
    try {
      await expect(run(addMedia, { path: outside, personId: 'p1' })).rejects.toMatchObject({ reason: 'PATH_NOT_ALLOWED' });
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });

  it('lists and deletes media through the operations of the app', async () => {
    const gql = jest.fn(async (query: string) =>
      query.includes('deleteMedia') ? { deleteMedia: true } : { getPersonMedia: [{ id: 'm1' }], getLinkedMedia: [] },
    );
    expect((await run(listMedia, { personId: 'p1' }, context(gql as never))).data).toEqual({ own: [{ id: 'm1' }], linked: [] });
    expect((await run(removeMedia, { mediaId: 'm1' }, context(gql as never))).data).toEqual({ deleted: true });
    expect(gql).toHaveBeenLastCalledWith(expect.stringContaining('deleteMedia'), { id: 'm1' });
  });
});

describe('export', () => {
  it('writes a ZIP into the folder as a job', async () => {
    const { data } = await run(exportFamilyTree, { folder: mockHome });
    const status = await finished((data as { jobId: string }).jobId);
    expect(status).toMatchObject({
      state: 'done',
      label: 'Kraft',
      result: { file: path.join(fs.realpathSync(mockHome), 'cognatio_Kraft_20261021.zip'), missingMedia: 1 },
    });
    expect(fs.readFileSync(path.join(mockHome, 'cognatio_Kraft_20261021.zip'), 'utf8')).toBe('zip');
  });

  it('writes GEDCOM with or without media', async () => {
    const plain = await run(exportFamilyTree, { folder: mockHome, format: 'GEDCOM' });
    expect((await finished((plain.data as { jobId: string }).jobId))?.result).toMatchObject({ file: expect.stringMatching(/_gedcom55\.1\.ged$/) });
    const gedzip = await run(exportFamilyTree, { folder: mockHome, format: 'GEDCOM', gedcomVersion: '7.0', media: true });
    expect((await finished((gedzip.data as { jobId: string }).jobId))?.result).toMatchObject({ file: expect.stringMatching(/_gedcom70\.gdz$/) });
  });

  it('refuses a folder that is a file', async () => {
    const file = path.join(mockHome, 'datei.txt');
    fs.writeFileSync(file, 'x');
    await expect(run(exportFamilyTree, { folder: file })).rejects.toMatchObject({ reason: 'FOLDER_NOT_FOUND' });
  });
});

describe('import', () => {
  const ged = path.join(mockHome, 'ahnen.ged');
  beforeAll(() => fs.writeFileSync(ged, '0 HEAD\n0 TRLR\n'));

  it('shows a preview first', async () => {
    const { data } = await run(importFile, { path: ged, target: 'NEW', previewOnly: true });
    expect(data).toMatchObject({
      kind: 'GEDCOM',
      importedPersons: 12,
      conflicts: 0,
      result: { MERGE_NEWER: { create: 12 } },
      ownAncestors: { MERGE_NEWER: 0 },
    });
    expect(jest.mocked(previewImport).mock.calls[0][1]).toBeNull();
    expect(startImportJob).not.toHaveBeenCalled();
  });

  it('starts the import into the family tree of the call', async () => {
    const { data } = await run(importFile, { path: ged, target: 'CURRENT', treeName: ' egal ' });
    expect(data).toMatchObject({ jobId: 'job-import' });
    expect(jest.mocked(startImportJob).mock.calls[0][0]).toMatchObject({ strategy: 'MERGE_NEWER', treeId: 'tree-1', decisions: {}, treeName: 'egal' });
  });

  it('overwrites only with the permission "delete"', async () => {
    await expect(run(importFile, { path: ged, target: 'CURRENT', strategy: 'OVERWRITE' })).rejects.toMatchObject({ reason: 'NOT_ALLOWED' });
    await run(importFile, { path: ged, target: 'CURRENT', strategy: 'OVERWRITE' }, context(undefined, { ...readOnlyPermissions(), transfer: 'delete' }));
    expect(jest.mocked(startImportJob)).toHaveBeenLastCalledWith(expect.objectContaining({ strategy: 'OVERWRITE' }));
  });
});

describe('backup', () => {
  it('writes a backup into the backup folder and lists it', async () => {
    const { data } = await run(createBackupTool, {});
    const status = await finished((data as { jobId: string }).jobId);
    expect(status).toMatchObject({ state: 'done', result: { file: path.join(process.env.BACKUP_DIR!, 'cognatio_backup_20261021_100000.zip') } });
    const listed = await run(listBackups, {});
    expect(listed.data).toMatchObject({ folder: process.env.BACKUP_DIR, backups: [{ bytes: 6 }] });
  });

  it('starts a restore of a file in the backup folder', async () => {
    const { data } = await run(restoreBackupTool, { path: path.join(process.env.BACKUP_DIR!, 'cognatio_backup_20261021_100000.zip') });
    expect(data).toMatchObject({ jobId: 'job-restore' });
    expect(jest.mocked(startRestoreJob).mock.calls[0][0]).toMatchObject({ purpose: 'backup', originalName: 'cognatio_backup_20261021_100000.zip', size: 6 });
  });

  it('reports unknown jobs', async () => {
    await expect(run(getJob, { jobId: 'weg' })).rejects.toMatchObject({ reason: 'JOB_NOT_FOUND' });
  });
});
