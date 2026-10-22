import fs from 'fs';
import os from 'os';
import path from 'path';
import { ensureUploadDir, uploadedBytes, uploadedFilePath } from '../uploads.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-uploads-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('uploaded files', () => {
  it('creates the folder and finds a file in it', () => {
    const sub = path.join(dir, 'neu', 'uploads');
    ensureUploadDir(sub);
    fs.writeFileSync(path.join(sub, 'a.bin'), 'inhalt');
    expect(uploadedFilePath('a.bin', sub)).toBe(path.join(sub, 'a.bin'));
  });

  it('returns null for a file that does not exist', () => {
    expect(uploadedFilePath('fehlt.bin', dir)).toBeNull();
  });

  it('cannot leave the folder with a manipulated name', () => {
    fs.writeFileSync(path.join(dir, 'außen.bin'), 'geheim');
    const inner = path.join(dir, 'inner');
    fs.mkdirSync(inner);
    expect(uploadedFilePath('../außen.bin', inner)).toBeNull();
  });

  it('adds up the sizes; a missing file counts as 0 and a path cannot leave the folder', () => {
    const sizes = path.join(dir, 'sizes');
    fs.mkdirSync(sizes);
    fs.writeFileSync(path.join(sizes, 'a.bin'), Buffer.alloc(10));
    fs.writeFileSync(path.join(sizes, 'b.bin'), Buffer.alloc(5));
    expect(uploadedBytes(['a.bin', 'b.bin', 'fehlt.bin', '../a.bin'], sizes)).toBe(25);
  });
});
