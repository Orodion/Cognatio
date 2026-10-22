import fs from 'fs';
import path from 'path';
import yazl from 'yazl';
import { collect, fileWith, removeTestDir, testDir, zipFileWith } from '../../../test/archives.js';
import { ArchiveFiles, RECORDS_MAX_BYTES, openArchive } from '../archive.js';
import { writeZip, writeZipFile } from '../zipWriter.js';
import type { TransferError } from '../../transfer/format.js';

const dir = testDir('archive');
afterAll(() => removeTestDir(dir));

const reason = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (err) {
    return (err as TransferError).reason;
  }
  return 'kein Fehler';
};

/** A ZIP file written by yazl (with ZIP64 records if `zip64`) */
async function yazlFile(entries: Record<string, string>, zip64 = false) {
  const zip = new yazl.ZipFile();
  for (const [name, content] of Object.entries(entries)) {
    zip.addBuffer(Buffer.from(content), name, { compress: false, forceZip64Format: zip64 });
  }
  zip.end({ forceZip64Format: zip64, comment: '' });
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) {
    chunks.push(chunk as Buffer);
  }
  return fileWith(dir, Buffer.concat(chunks));
}

describe('openArchive', () => {
  it('lists the entries without reading them and copies one piece by piece', async () => {
    const archive = await openArchive(zipFileWith(dir, { 'a/b.txt': 'hallo', 'leer/': new Uint8Array(0) }), 'INVALID_ZIP');
    try {
      expect(archive.files.names()).toEqual(['a/b.txt']);
      expect(archive.files.size('a/b.txt')).toBe(5);
      let copied = 0;
      const target = path.join(dir, 'b.txt');
      await archive.files.copyTo('a/b.txt', target, (bytes) => (copied += bytes));
      expect(fs.readFileSync(target, 'utf8')).toBe('hallo');
      expect(copied).toBe(5);
      expect((await archive.files.read('a/b.txt')).toString()).toBe('hallo');
    } finally {
      archive.close();
    }
  });

  it('reads archives with ZIP64 records (above 4 GB)', async () => {
    const archive = await openArchive(await yazlFile({ 'persons.json': '{}', 'media/x.jpg': 'bild' }, true), 'INVALID_ZIP');
    try {
      expect(archive.files.names().sort()).toEqual(['media/x.jpg', 'persons.json']);
      expect((await archive.files.read('media/x.jpg')).toString()).toBe('bild');
    } finally {
      archive.close();
    }
  });

  it('detects a damaged entry by its checksum and leaves no file behind', async () => {
    const file = await yazlFile({ 'x.txt': 'AAAAAAAAAA' });
    const bytes = fs.readFileSync(file);
    // Stored without compression: change one byte of the content
    const at = bytes.indexOf(Buffer.from('AAAAAAAAAA'));
    expect(at).toBeGreaterThan(0);
    bytes[at] = 0x42;
    fs.writeFileSync(file, bytes);
    const archive = await openArchive(file, 'BACKUP_INVALID');
    try {
      const target = path.join(dir, 'kaputt.txt');
      expect(await reason(() => archive.files.copyTo('x.txt', target))).toBe('BACKUP_INVALID');
      expect(fs.existsSync(target)).toBe(false);
      expect(await reason(() => archive.files.read('x.txt'))).toBe('BACKUP_INVALID');
    } finally {
      archive.close();
    }
  });

  it('refuses names that would lead out of a folder', async () => {
    expect(await reason(() => openArchive(zipFileWith(dir, { '../boese.txt': 'x' }), 'INVALID_ZIP'))).toBe('INVALID_ZIP');
  });

  it('refuses a file that is no ZIP file', async () => {
    expect(await reason(() => openArchive(fileWith(dir, 'PK kaputt'), 'INVALID_ZIP'))).toBe('INVALID_ZIP');
  });

  it('checks the unpacked size before anything is unpacked', async () => {
    const file = zipFileWith(dir, { 'a.bin': new Uint8Array(1000), 'b.bin': new Uint8Array(1000) });
    expect(await reason(() => openArchive(file, 'INVALID_ZIP', 1500))).toBe('UNPACKED_TOO_LARGE');
  });
});

describe('ArchiveFiles', () => {
  it('shows the same entries under other names and sums their sizes', async () => {
    const files = ArchiveFiles.fromBuffers({ 'export/a.jpg': new Uint8Array(3), 'export/b.jpg': new Uint8Array(4) });
    const view = files.view([
      ['a.jpg', 'export/a.jpg'],
      ['export/a.jpg', 'export/a.jpg'],
      ['fehlt.jpg', 'export/fehlt.jpg'],
    ]);
    expect(view.names()).toEqual(['a.jpg', 'export/a.jpg']);
    expect(view.totalSize(['a.jpg', 'a.jpg', 'fehlt.jpg'])).toBe(3);
    expect(await reason(() => view.read('fehlt.jpg'))).toBe('INVALID_ZIP');
  });

  it('reads the records into memory only up to a limit', async () => {
    const open = jest.fn();
    const files = new ArchiveFiles(new Map([['data.json', { size: RECORDS_MAX_BYTES + 1, open }]]), 'BACKUP_INVALID');
    expect(await reason(() => files.read('data.json'))).toBe('BACKUP_INVALID');
    expect(open).not.toHaveBeenCalled();
  });
});

describe('writeZip', () => {
  it('writes files from disk and buffers; the size is known in advance', async () => {
    const photo = fileWith(dir, 'bild', 'foto.jpg');
    const zip = writeZip([
      { name: 'persons.json', buffer: Buffer.from('{}') },
      { name: 'media/foto.jpg', file: photo },
    ]);
    const size = await zip.size;
    const bytes = await collect(zip);
    expect(bytes.length).toBe(size);

    const archive = await openArchive(fileWith(dir, bytes), 'INVALID_ZIP');
    try {
      expect((await archive.files.read('media/foto.jpg')).toString()).toBe('bild');
    } finally {
      archive.close();
    }
  });

  it('closes the file being read when the archive is no longer wanted (a cancelled download)', async () => {
    const big = fileWith(dir, Buffer.alloc(4 * 1024 * 1024, 1), 'gross.bin');
    const zip = writeZip([{ name: 'gross.bin', file: big }]);
    await zip.size;
    // Read a little, then stop like a client that cancels
    await new Promise<void>((resolve) => zip.stream.once('data', () => resolve()));
    zip.stream.destroy();
    await new Promise((resolve) => setTimeout(resolve, 50));
    // On Windows an open file could not be renamed; here it is closed again
    fs.renameSync(big, `${big}.weg`);
    expect(fs.existsSync(`${big}.weg`)).toBe(true);
  });

  it('stops writing into a file when the progress says so (the user cancelled)', async () => {
    const target = path.join(dir, 'abgebrochen.zip');
    const zip = writeZip([{ name: 'a.bin', file: fileWith(dir, Buffer.alloc(1024 * 1024, 2)) }]);
    await expect(writeZipFile(zip, target, () => new Error('CANCELLED'))).rejects.toThrow('CANCELLED');
    expect(fs.existsSync(target)).toBe(false);
    expect(fs.existsSync(`${target}.part`)).toBe(false);
  });

  it('writes into a file and leaves nothing half written when it fails', async () => {
    const target = path.join(dir, 'ganz.zip');
    await writeZipFile(writeZip([{ name: 'a.txt', buffer: Buffer.from('a') }]), target);
    expect(fs.existsSync(target)).toBe(true);

    const broken = path.join(dir, 'kaputt.zip');
    await expect(writeZipFile(writeZip([{ name: 'fehlt.jpg', file: path.join(dir, 'gibt-es-nicht.jpg') }]), broken)).rejects.toThrow();
    expect(fs.existsSync(broken)).toBe(false);
    expect(fs.existsSync(`${broken}.part`)).toBe(false);
  });
});
