import fs from 'fs';
import path from 'path';
import { collect, fileWith, removeTestDir, testDir, zipFileWith } from '../../../test/archives.js';

const tmpDir = testDir('transfer');
const work = testDir('transfer-work');
jest.mock('../../files/uploads.js', () => ({ ...jest.requireActual('../../files/uploads.js'), uploadDir: tmpDir }));

import { createZip, exportFileName, fileTimestamp, safeName } from '../exportData.js';
import { readImportFile } from '../readImport.js';
import { splitLongText, type TransferData, type TransferError } from '../format.js';
import { MAX_NOTE_LENGTH } from '../../personValues.js';
import { person, transfer } from '../../../test/transferFixtures.js';

afterAll(() => {
  removeTestDir(tmpDir);
  removeTestDir(work);
});

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

const reason = async (fn: () => unknown) => {
  try {
    await fn();
  } catch (err) {
    return (err as TransferError).reason;
  }
  return 'kein Fehler';
};

/** Reads an import file from content in memory (as uploaded) */
const read = async (content: Uint8Array | string, name: string) => {
  const file = await readImportFile(fileWith(work, content), name);
  file.close();
  return file;
};

/** Content of a file in the import, copied out of the archive */
async function content(file: Awaited<ReturnType<typeof readImportFile>>, name: string) {
  const target = path.join(work, `copy-${Math.random()}`);
  await file.files.copyTo(name, target);
  return [...fs.readFileSync(target)];
}

/** Export written into a file and read again (the archive stays open for copying) */
async function roundTrip(data: TransferData, files: Array<{ zipPath: string; diskName: string }>, includeMedia: boolean) {
  const { zip, missing } = createZip(data, files, includeMedia);
  const bytes = await collect(zip);
  return { back: await readImportFile(fileWith(work, bytes), 'export.zip'), missing, bytes };
}

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

  it('packs persons.json and media; missing files are left out consistently', async () => {
    const { back, missing } = await roundTrip(data, files, true);
    expect(missing).toEqual(['media/Muster_a/muster_a_foto_2.jpg']);
    expect(back.kind).toBe('ZIP');
    expect(back.data.persons[0].media.map((m) => m.id)).toEqual(['m1']);
    expect(back.data.persons[0].profilePictureId).toBe('m1');
    expect(await content(back, 'media/Muster_a/muster_a_foto_1.jpg')).toEqual([1, 2, 3]);
    back.close();
  });

  it('knows the exact size of the export before it is written', async () => {
    const { zip } = createZip(data, files, true);
    const size = await zip.size;
    expect((await collect(zip)).length).toBe(size);
  });

  it('drops event links to media whose file is missing, also across persons', async () => {
    const event = (id: string, mediaIds: string[]) => ({ id, title: 'Fest', category: 'OTHER', mediaIds, citationIds: [], ...stamps });
    const linked = transfer([{ ...data.persons[0], events: [event('e1', ['m1', 'm2'])] }, person('b', { events: [event('e2', ['m1', 'm2'])] })]);
    const { back } = await roundTrip(linked, files, true);
    back.close();
    expect(back.data.persons.map((p) => p.events[0].mediaIds)).toEqual([['m1'], ['m1']]);
  });

  it('sorts the links of an event and checks that the linked media exist', async () => {
    const file = transfer([
      person('a', {
        events: [{ id: 'e1', title: 'Taufe', category: 'BAPTISM', mediaIds: ['m2', 'm1', 'm2'], citationIds: [], ...stamps }],
        media: [media('m1', 'x.jpg'), media('m2', 'y.jpg')],
      }),
    ]);
    const zip = (value: unknown) => zipFileWith(work, { 'persons.json': JSON.stringify(value) });
    expect((await readImportFile(zip(file), 'datei.zip')).data.persons[0].events[0].mediaIds).toEqual(['m1', 'm2']);

    file.persons[0].events[0].mediaIds = ['fehlt'];
    expect(await reason(() => readImportFile(zip(file), 'datei.zip'))).toBe('INTEGRITY');
  });

  it('takes the neutral value for a gender, date precision, marital status or category the app does not know', async () => {
    const file = transfer([
      person('a', {
        gender: 'DIVERSE',
        maritalStatus: 'ENGAGED',
        birthDatePrecision: 'ABOUT',
        deathDatePrecision: 'YEAR',
        events: [{ id: 'e1', title: 'Fest', category: 'PARTY', datePrecision: 'CIRCA', mediaIds: [], citationIds: [], ...stamps }],
      }),
    ]);
    const [back] = (await readImportFile(zipFileWith(work, { 'persons.json': JSON.stringify(file) }), 'datei.zip')).data.persons;
    expect(back).toMatchObject({ gender: 'UNKNOWN', maritalStatus: null, birthDatePrecision: null, deathDatePrecision: 'YEAR' });
    expect(back.events[0]).toMatchObject({ category: 'OTHER', datePrecision: null });
  });

  it('splits a note longer than a note of the app into several notes', async () => {
    const long = `${'Erster Teil. '.repeat(700)}
${'Zweiter Teil. '.repeat(500)}`;
    const file = transfer([person('a', { notes: [{ id: 'n1', text: long, ...stamps }] })]);
    const [back] = (await readImportFile(zipFileWith(work, { 'persons.json': JSON.stringify(file) }), 'datei.zip')).data.persons;

    expect(back.notes.map((n) => n.id)).toEqual(['n1', 'n1~2']);
    expect(back.notes.every((n) => n.text.length <= MAX_NOTE_LENGTH)).toBe(true);
    // Cut at the line break, nothing is lost
    expect(back.notes[0].text).toBe('Erster Teil. '.repeat(700).trim());
    expect(back.notes[1].text).toBe('Zweiter Teil. '.repeat(500).trim());
  });

  it('refuses media that are larger than the optional limit before writing anything', async () => {
    // abc.jpg has 3 bytes
    expect(await reason(() => createZip(data, files, true, 2))).toBe('EXPORT_TOO_LARGE');
    expect(() => createZip(data, files, true, 3)).not.toThrow();
    // Without media only persons.json is written: the limit does not apply
    expect(() => createZip(data, files, false, 0)).not.toThrow();
    // Without a limit everything is exported
    expect(() => createZip(data, files, true, Infinity)).not.toThrow();
  });

  it('rejects an import file that is too large once unpacked', async () => {
    process.env.IMPORT_MAX_UNPACKED_MB = '1';
    try {
      const big = zipFileWith(work, { 'persons.json': '{}', 'media/x.bin': new Uint8Array(2 * 1024 * 1024) });
      expect(await reason(() => readImportFile(big, 'export.zip'))).toBe('UNPACKED_TOO_LARGE');
    } finally {
      delete process.env.IMPORT_MAX_UNPACKED_MB;
    }
  });

  it('can export without media', async () => {
    const { back } = await roundTrip(data, files, false);
    back.close();
    expect(back.data.persons[0].media).toEqual([]);
    expect(back.data.persons[0].profilePictureId).toBeNull();
    expect(back.files.names()).toEqual([]);
  });

  it('finds persons.json in a subfolder of a repacked archive', async () => {
    const back = await readImportFile(
      zipFileWith(work, { 'backup/persons.json': JSON.stringify(transfer([person('a')])), 'backup/media/x.jpg': new Uint8Array([9]) }),
      'backup.zip',
    );
    expect(back.data.persons).toHaveLength(1);
    expect(back.files.names()).toEqual(['media/x.jpg']);
    expect(await content(back, 'media/x.jpg')).toEqual([9]);
    back.close();
  });

  it('reports broken or incomplete files with a reason', async () => {
    expect(await reason(() => read('PK kaputt', 'x.zip'))).toBe('INVALID_ZIP');
    expect(await reason(() => readImportFile(zipFileWith(work, { 'a.txt': 'x' }), 'x.zip'))).toBe('MISSING_PERSONS_JSON');
    expect(await reason(() => readImportFile(zipFileWith(work, { 'persons.json': '{kaputt' }), 'x.zip'))).toBe('INVALID_JSON');
    expect(await reason(() => readImportFile(zipFileWith(work, { 'persons.json': '{}' }), 'x.zip'))).toBe('INVALID_SCHEMA');
    expect(await reason(() => read('hallo', 'notizen.txt'))).toBe('UNSUPPORTED_FILE');
  });
});

describe('GEDCOM files', () => {
  it('recognises GEDCOM and its encoding', async () => {
    const ged = '0 HEAD\n1 CHAR ANSI\n0 @I1@ INDI\n1 NAME Jürgen /Groß/\n0 TRLR\n';
    const back = await read(Buffer.from(ged, 'latin1'), 'alt.ged');
    expect(back.kind).toBe('GEDCOM');
    expect(back.data.persons[0]).toMatchObject({ firstName: 'Jürgen', lastName: 'Groß' });

    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('0 HEAD\n0 @I1@ INDI\n1 NAME Ann /Lee/\n0 TRLR\n', 'utf16le')]);
    expect((await read(utf16, 'x.ged')).data.persons[0].firstName).toBe('Ann');
  });

  it('rejects ANSEL encoded files with a clear reason', async () => {
    expect(await reason(() => read('0 HEAD\n1 CHAR ANSEL\n0 TRLR\n', 'alt.ged'))).toBe('UNSUPPORTED_ENCODING');
  });
});

describe('splitLongText', () => {
  it('cuts at a line break, else at a blank, else hard', () => {
    expect(splitLongText('ab cd\nef', 6)).toEqual(['ab cd', 'ef']);
    expect(splitLongText('abc def ghi', 8)).toEqual(['abc def', 'ghi']);
    expect(splitLongText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
    expect(splitLongText('  kurz  ', 10)).toEqual(['kurz']);
  });
});
