import fs from 'fs';
import path from 'path';
import { removeTestDir, testDir } from '../../../test/archives.js';

const tmpDir = testDir('staged');
jest.mock('../uploads.js', () => ({ ...jest.requireActual('../uploads.js'), uploadDir: tmpDir }));

import { STAGED_UPLOAD_MS, clearStagedUploads, discardUpload, stageUpload, stagedUpload, stagingDir } from '../stagedUploads.js';
import type { TransferError } from '../../transfer/format.js';

afterAll(() => removeTestDir(tmpDir));
beforeEach(() => clearStagedUploads());

/** A file as the storage of multer leaves it: in the staging folder, the hash in `filename` */
function received(content = 'inhalt') {
  fs.mkdirSync(stagingDir(), { recursive: true });
  const file = path.join(stagingDir(), `import-${Math.random()}.upload`);
  fs.writeFileSync(file, content);
  return { path: file, size: content.length, originalname: 'familie.zip', filename: 'abc123' } as Express.Multer.File;
}

const reason = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return (err as TransferError).reason;
  }
  return 'kein Fehler';
};

describe('staged uploads', () => {
  it('lives in a dot folder of the upload folder (not served, same drive as the media)', () => {
    expect(stagingDir()).toBe(path.join(tmpDir, '.staging'));
  });

  it('keeps an upload until it is used, then removes the file', () => {
    const upload = stageUpload('import', received());
    expect(upload).toMatchObject({ purpose: 'import', originalName: 'familie.zip', size: 6, sha256: 'abc123' });
    expect(stagedUpload('import', upload.id)).toBe(upload);
    discardUpload(upload);
    expect(fs.existsSync(upload.path)).toBe(false);
    expect(reason(() => stagedUpload('import', upload.id))).toBe('UPLOAD_NOT_FOUND');
  });

  it('replaces the earlier upload of the same purpose, not of another one', () => {
    const first = stageUpload('import', received());
    const backup = stageUpload('backup', received());
    const second = stageUpload('import', received());
    expect(reason(() => stagedUpload('import', first.id))).toBe('UPLOAD_NOT_FOUND');
    expect(fs.existsSync(first.path)).toBe(false);
    expect(stagedUpload('import', second.id)).toBe(second);
    expect(stagedUpload('backup', backup.id)).toBe(backup);
    // The id of one purpose does not open the upload of another one
    expect(reason(() => stagedUpload('import', backup.id))).toBe('UPLOAD_NOT_FOUND');
  });

  it('forgets uploads after a day', () => {
    const now = Date.now();
    const upload = stageUpload('backup', received(), now);
    expect(stagedUpload('backup', upload.id, now + STAGED_UPLOAD_MS)).toBe(upload);
    expect(reason(() => stagedUpload('backup', upload.id, now + STAGED_UPLOAD_MS + 1))).toBe('UPLOAD_NOT_FOUND');
    expect(fs.existsSync(upload.path)).toBe(false);
  });

  it('needs a file and a valid id', () => {
    expect(reason(() => stageUpload('import', undefined))).toBe('NO_FILE');
    expect(reason(() => stagedUpload('import', 42))).toBe('UPLOAD_NOT_FOUND');
  });

  it('removes the files of an earlier run at the start', () => {
    stageUpload('import', received());
    clearStagedUploads();
    expect(fs.existsSync(stagingDir())).toBe(false);
  });
});
