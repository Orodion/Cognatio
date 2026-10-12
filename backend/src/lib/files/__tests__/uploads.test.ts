import fs from 'fs';
import os from 'os';
import path from 'path';
import { ensureUploadDir, readUploadedFile, uploadedBytes, writeUploadedFile } from '../uploads.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-uploads-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('uploaded files', () => {
  it('creates the folder, writes a file and reads it back', () => {
    const sub = path.join(dir, 'neu', 'uploads');
    ensureUploadDir(sub);
    writeUploadedFile('a.bin', Buffer.from('inhalt'), sub);
    expect(readUploadedFile('a.bin', sub)?.toString()).toBe('inhalt');
  });

  it('returns null for a file that does not exist', () => {
    expect(readUploadedFile('fehlt.bin', dir)).toBeNull();
  });

  it('cannot leave the folder with a manipulated name', () => {
    fs.writeFileSync(path.join(dir, 'außen.bin'), 'geheim');
    const inner = path.join(dir, 'inner');
    fs.mkdirSync(inner);
    expect(readUploadedFile('../außen.bin', inner)).toBeNull();
    writeUploadedFile('../x.bin', Buffer.from('1'), inner);
    expect(fs.existsSync(path.join(dir, 'x.bin'))).toBe(false);
    expect(fs.existsSync(path.join(inner, 'x.bin'))).toBe(true);
  });

  it('adds up the sizes; a missing file counts as 0 and a path cannot leave the folder', () => {
    const sizes = path.join(dir, 'sizes');
    fs.mkdirSync(sizes);
    fs.writeFileSync(path.join(sizes, 'a.bin'), Buffer.alloc(10));
    fs.writeFileSync(path.join(sizes, 'b.bin'), Buffer.alloc(5));
    expect(uploadedBytes(['a.bin', 'b.bin', 'fehlt.bin', '../a.bin'], sizes)).toBe(25);
  });
});
