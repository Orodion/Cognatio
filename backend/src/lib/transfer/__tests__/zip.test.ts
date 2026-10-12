import fs from 'fs';
import os from 'os';
import path from 'path';
import { zipSync, strToU8 } from 'fflate';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-transfer-'));
jest.mock('../../files/uploads.js', () => ({ ...jest.requireActual('../../files/uploads.js'), uploadDir: tmpDir }));

import { createZip, exportFileName, fileTimestamp, safeName } from '../exportData.js';
import { assertMediaSizes, readImportFile } from '../readImport.js';
import type { TransferError } from '../format.js';
import { person, transfer } from '../../../test/transferFixtures.js';

afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const media = (id: string, mediaPath: string) => ({
  id,
  path: mediaPath,
  originalFileName: 'Foto.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 3,
  type: 'PHOTO',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const stamps = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

const reason = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return (err as TransferError).reason;
  }
  return 'kein Fehler';
};

describe('file names', () => {
  it('uses readable names without special characters', () => {
    expect(safeName('Müller-Lüdenscheidt')).toBe('Mueller_Luedenscheidt');
    expect(safeName('José Ñoño')).toBe('Jose_Nono');
    expect(safeName('  ')).toBe('unknown');
  });

  it('names the export after the most common surname and the time', () => {
    const d = new Date(2026, 8, 28, 14, 30, 5);
    expect(fileTimestamp(d)).toBe('20260928_143005');
    const data = transfer([person('a', { lastName: 'Groß' }), person('b', { lastName: 'Groß' }), person('c', { lastName: 'Klein' })]);
    expect(exportFileName(data, d)).toBe('family_tree_Gross_20260928_143005');
    expect(exportFileName(transfer([]), d)).toBe('family_tree_20260928_143005');
  });
});

describe('ZIP export and import', () => {
  fs.writeFileSync(path.join(tmpDir, 'abc.jpg'), Buffer.from([1, 2, 3]));
  const data = transfer([
    person('a', {
      profilePictureId: 'm1',
      media: [media('m1', 'media/Muster_a/muster_a_foto_1.jpg'), media('m2', 'media/Muster_a/muster_a_foto_2.jpg')],
    }),
  ]);
  const files = [
    { zipPath: 'media/Muster_a/muster_a_foto_1.jpg', diskName: 'abc.jpg' },
    { zipPath: 'media/Muster_a/muster_a_foto_2.jpg', diskName: 'fehlt.jpg' },
  ];

  it('packs persons.json and media; missing files are left out consistently', () => {
    const { buffer, missing } = createZip(data, files, true);
    expect(missing).toEqual(['media/Muster_a/muster_a_foto_2.jpg']);

    const back = readImportFile(buffer, 'export.zip');
    expect(back.kind).toBe('ZIP');
    expect(back.data.persons[0].media.map((m) => m.id)).toEqual(['m1']);
    expect(back.data.persons[0].profilePictureId).toBe('m1');
    expect([...back.files.get('media/Muster_a/muster_a_foto_1.jpg')!]).toEqual([1, 2, 3]);
  });

  it('drops event links to media whose file is missing, also across persons', () => {
    const event = (id: string, mediaIds: string[]) => ({ id, title: 'Fest', category: 'OTHER', mediaIds, ...stamps });
    const linked = transfer([{ ...data.persons[0], events: [event('e1', ['m1', 'm2'])] }, person('b', { events: [event('e2', ['m1', 'm2'])] })]);
    const back = readImportFile(createZip(linked, files, true).buffer, 'export.zip');
    expect(back.data.persons.map((p) => p.events[0].mediaIds)).toEqual([['m1'], ['m1']]);
  });

  it('sorts the links of an event and checks that the linked media exist', () => {
    const file = transfer([
      person('a', {
        events: [{ id: 'e1', title: 'Taufe', category: 'BAPTISM', mediaIds: ['m2', 'm1', 'm2'], ...stamps }],
        media: [media('m1', 'x.jpg'), media('m2', 'y.jpg')],
      }),
    ]);
    const zip = (content: unknown) => Buffer.from(zipSync({ 'persons.json': strToU8(JSON.stringify(content)) }));
    expect(readImportFile(zip(file), 'datei.zip').data.persons[0].events[0].mediaIds).toEqual(['m1', 'm2']);

    file.persons[0].events[0].mediaIds = ['fehlt'];
    expect(reason(() => readImportFile(zip(file), 'datei.zip'))).toBe('INTEGRITY');
  });

  it('takes the neutral value for a gender, date precision or category the app does not know', () => {
    const file = transfer([
      person('a', {
        gender: 'DIVERSE',
        birthDatePrecision: 'ABOUT',
        deathDatePrecision: 'YEAR',
        events: [{ id: 'e1', title: 'Fest', category: 'PARTY', datePrecision: 'CIRCA', mediaIds: [], ...stamps }],
      }),
    ]);
    const zip = Buffer.from(zipSync({ 'persons.json': strToU8(JSON.stringify(file)) }));
    const [back] = readImportFile(zip, 'datei.zip').data.persons;
    expect(back).toMatchObject({ gender: 'UNKNOWN', birthDatePrecision: null, deathDatePrecision: 'YEAR' });
    expect(back.events[0]).toMatchObject({ category: 'OTHER', datePrecision: null });
  });

  it('refuses media that are larger than the limit before reading them', () => {
    // abc.jpg has 3 bytes
    expect(reason(() => createZip(data, files, true, 2))).toBe('EXPORT_TOO_LARGE');
    expect(() => createZip(data, files, true, 3)).not.toThrow();
    // Without media only persons.json is written: the limit does not apply
    expect(() => createZip(data, files, false, 0)).not.toThrow();
  });

  it('rejects an import file that is too large once unpacked', () => {
    process.env.IMPORT_MAX_UNPACKED_MB = '1';
    try {
      const big = Buffer.from(zipSync({ 'persons.json': strToU8('{}'), 'media/x.bin': new Uint8Array(2 * 1024 * 1024) }));
      expect(reason(() => readImportFile(big, 'export.zip'))).toBe('UNPACKED_TOO_LARGE');
    } finally {
      delete process.env.IMPORT_MAX_UNPACKED_MB;
    }
  });

  it('can export without media', () => {
    const back = readImportFile(createZip(data, files, false).buffer, 'export.zip');
    expect(back.data.persons[0].media).toEqual([]);
    expect(back.data.persons[0].profilePictureId).toBeNull();
    expect(back.files.size).toBe(0);
  });

  it('finds persons.json in a subfolder of a repacked archive', () => {
    const zip = zipSync({
      'backup/persons.json': strToU8(JSON.stringify(transfer([person('a')]))),
      'backup/media/x.jpg': new Uint8Array([9]),
    });
    const back = readImportFile(Buffer.from(zip), 'backup.zip');
    expect(back.data.persons).toHaveLength(1);
    expect([...back.files.keys()]).toEqual(['media/x.jpg']);
  });

  it('reports broken or incomplete files with a reason', () => {
    expect(reason(() => readImportFile(Buffer.from('PK kaputt'), 'x.zip'))).toBe('INVALID_ZIP');
    expect(reason(() => readImportFile(Buffer.from(zipSync({ 'a.txt': strToU8('x') })), 'x.zip'))).toBe('MISSING_PERSONS_JSON');
    expect(reason(() => readImportFile(Buffer.from(zipSync({ 'persons.json': strToU8('{kaputt') })), 'x.zip'))).toBe('INVALID_JSON');
    expect(reason(() => readImportFile(Buffer.from(zipSync({ 'persons.json': strToU8('{}') })), 'x.zip'))).toBe('INVALID_SCHEMA');
    expect(reason(() => readImportFile(Buffer.from('hallo'), 'notizen.txt'))).toBe('UNSUPPORTED_FILE');
  });
});

describe('GEDCOM files', () => {
  it('recognises GEDCOM and its encoding', () => {
    const ged = '0 HEAD\n1 CHAR ANSI\n0 @I1@ INDI\n1 NAME Jürgen /Groß/\n0 TRLR\n';
    const back = readImportFile(Buffer.from(ged, 'latin1'), 'alt.ged');
    expect(back.kind).toBe('GEDCOM');
    expect(back.data.persons[0]).toMatchObject({ firstName: 'Jürgen', lastName: 'Groß' });

    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('0 HEAD\n0 @I1@ INDI\n1 NAME Ann /Lee/\n0 TRLR\n', 'utf16le')]);
    expect(readImportFile(utf16, 'x.ged').data.persons[0].firstName).toBe('Ann');
  });

  it('rejects ANSEL encoded files with a clear reason', () => {
    expect(reason(() => readImportFile(Buffer.from('0 HEAD\n1 CHAR ANSEL\n0 TRLR\n'), 'alt.ged'))).toBe('UNSUPPORTED_ENCODING');
  });
});

describe('assertMediaSizes', () => {
  it('refuses files the database cannot record and names them', () => {
    const files = { 'media/a/klein.jpg': new Uint8Array(4), 'media/b/film.mp4': new Uint8Array(9) };
    expect(() => assertMediaSizes(files, 8)).toThrow(expect.objectContaining({ reason: 'MEDIA_TOO_LARGE', details: ['media/b/film.mp4'] }));
    expect(() => assertMediaSizes(files, 9)).not.toThrow();
  });
});
