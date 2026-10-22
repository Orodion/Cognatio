import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { collect, fileWith, removeTestDir, testDir, zipFileWith } from '../../../test/archives.js';

const tmpDir = testDir('gedzip');
const work = testDir('gedzip-work');
jest.mock('../../files/uploads.js', () => ({ ...jest.requireActual('../../files/uploads.js'), uploadDir: tmpDir }));

import { createGedzip } from '../exportData.js';
import { parseGedcom, resolveMediaFile, toGedcom } from '../gedcom.js';
import { readImportFile } from '../readImport.js';
import { validateTransfer, type TransferMedia } from '../format.js';
import { ArchiveFiles } from '../../files/archive.js';
import { person, transfer } from '../../../test/transferFixtures.js';

afterAll(() => {
  removeTestDir(tmpDir);
  removeTestDir(work);
});

const stamp = '2026-03-04T05:06:07.890Z';
const media = (id: string, mediaPath: string, overrides: Partial<TransferMedia> = {}): TransferMedia => ({
  id,
  path: mediaPath,
  originalFileName: 'Portrait Oma.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 3,
  type: 'PHOTO',
  createdAt: stamp,
  updatedAt: stamp,
  ...overrides,
});

describe('GEDCOM identifiers and change dates', () => {
  const personId = randomUUID();
  const eventId = randomUUID();
  const data = transfer([
    person(personId, {
      firstName: 'Anna',
      updatedAt: stamp,
      events: [{ id: eventId, title: 'Taufe', category: 'BAPTISM', mediaIds: [], citationIds: [], date: '1950', createdAt: stamp, updatedAt: stamp }],
    }),
  ]);

  it.each(['5.5.1', '7.0'] as const)('keeps IDs and the modification time (GEDCOM %s)', (version) => {
    const ged = toGedcom(data, version);
    expect(ged).toContain(`1 ${version === '7.0' ? 'UID' : '_UID'} ${personId}`);
    expect(ged).toContain('1 CHAN\r\n2 DATE 4 MAR 2026\r\n3 TIME 05:06:07.890');

    const back = parseGedcom(ged);
    expect(back.persons[0].id).toBe(personId);
    expect(back.persons[0].updatedAt).toBe(stamp);
    expect(back.persons[0].events[0].id).toBe(eventId);
  });

  it('takes the file date from the header and identifiers of other programs', () => {
    const ged = [
      '0 HEAD',
      '1 GEDC',
      '2 VERS 5.5.1',
      '1 DATE 1 FEB 2020',
      '2 TIME 10:20',
      '0 @I1@ INDI',
      '1 NAME Karl /Alt/',
      '1 _UID 0123456789ABCDEF0123456789ABCDEF',
      '0 @I2@ INDI',
      '1 NAME Eva /Alt/',
      '1 _UID mit leerzeichen',
      '0 TRLR',
    ].join('\n');
    const back = parseGedcom(ged);
    expect(back.exportedAt).toBe('2020-02-01T10:20:00.000Z');
    expect(back.persons[0].id).toBe('0123456789ABCDEF0123456789ABCDEF');
    expect(back.persons[1].id).not.toBe('mit leerzeichen');
  });

  it('gives every record its own ID even if the file repeats one', () => {
    const uid = randomUUID();
    const ged = ['0 HEAD', '0 @I1@ INDI', '1 NAME A //', `1 UID ${uid}`, '0 @I2@ INDI', '1 NAME B //', `1 UID ${uid}`, '0 TRLR'].join('\n');
    const ids = parseGedcom(ged).persons.map((p) => p.id);
    expect(ids[0]).toBe(uid);
    expect(ids[1]).not.toBe(uid);
  });
});

describe('media in GEDCOM', () => {
  const personId = randomUUID();
  const eventId = randomUUID();
  const portrait = randomUUID();
  const urkunde = randomUUID();
  const data = transfer([
    person(personId, {
      firstName: 'Anna',
      profilePictureId: portrait,
      events: [{ id: eventId, title: 'Taufe', category: 'BAPTISM', mediaIds: [urkunde], citationIds: [], createdAt: stamp, updatedAt: stamp }],
      media: [
        media(portrait, 'media/Muster_Anna/muster_anna_profilbild_1.jpg', { type: 'PROFILE_PICTURE' }),
        media(urkunde, 'media/Muster_Anna/muster_anna_taufe_1.pdf', {
          originalFileName: 'Taufschein.pdf',
          mimeType: 'application/pdf',
          type: 'DOCUMENT',
        }),
      ],
    }),
  ]);
  const files = ArchiveFiles.fromBuffers({
    'media/Muster_Anna/muster_anna_profilbild_1.jpg': new Uint8Array([1, 2, 3]),
    'media/Muster_Anna/muster_anna_taufe_1.pdf': new Uint8Array([4, 5, 6, 7]),
  });

  it.each(['5.5.1', '7.0'] as const)('writes media records and reads them back with the files (GEDCOM %s)', (version) => {
    const ged = toGedcom(data, version, new Date(), { media: true });
    expect(ged).toContain('1 OBJE @M1@\r\n2 _PRIM Y');
    expect(ged).toContain(`2 FORM ${version === '7.0' ? 'application/pdf' : 'pdf'}`);
    expect(ged).toContain('2 TITL Taufschein.pdf');

    const back = validateTransfer(parseGedcom(ged, files));
    const anna = back.persons[0];
    expect(anna.profilePictureId).toBe(portrait);
    expect(anna.media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: portrait, type: 'PROFILE_PICTURE', mimeType: 'image/jpeg', originalFileName: 'Portrait Oma.jpg', sizeBytes: 3 }),
        expect.objectContaining({ id: urkunde, type: 'DOCUMENT', mimeType: 'application/pdf', sizeBytes: 4 }),
      ]),
    );
    expect(anna.events[0].mediaIds).toEqual([urkunde]);
    expect(anna.notes).toEqual([]);
  });

  it('keeps a group photo once with its owner and links it to events of other persons', () => {
    const otherId = randomUUID();
    const wedding = randomUUID();
    const shared = transfer([
      ...data.persons,
      person(otherId, {
        firstName: 'Karl',
        events: [{ id: wedding, title: 'Hochzeit', category: 'WEDDING', mediaIds: [portrait, urkunde], citationIds: [], createdAt: stamp, updatedAt: stamp }],
      }),
    ]);
    const ged = toGedcom(shared, '7.0', new Date(), { media: true });
    // One OBJE record per file, only a reference at the other person's event
    expect(ged.match(/^0 @M\d+@ OBJE/gm)).toHaveLength(2);

    const back = validateTransfer(parseGedcom(ged, files));
    const anna = back.persons.find((p) => p.id === personId)!;
    const karl = back.persons.find((p) => p.id === otherId)!;
    expect(anna.media.map((m) => m.id).sort()).toEqual([portrait, urkunde].sort());
    expect(karl.media).toEqual([]);
    expect(karl.events[0].mediaIds).toEqual([portrait, urkunde].sort());
  });

  it('takes over media that other programs only list at an event', () => {
    const ged = [
      '0 HEAD',
      '1 GEDC',
      '2 VERS 7.0',
      '0 @I1@ INDI',
      '1 NAME Eva /Muster/',
      '1 RESI',
      '2 PLAC Köln',
      '2 OBJE @M1@',
      '0 @I2@ INDI',
      '1 NAME Paul /Muster/',
      '1 EVEN Umzug',
      '2 TYPE MOVE',
      '2 OBJE @M1@',
      '0 @M1@ OBJE',
      '1 FILE media/Muster_Anna/muster_anna_taufe_1.pdf',
      '2 FORM application/pdf',
      '0 TRLR',
    ].join('\n');
    const back = validateTransfer(parseGedcom(ged, files));
    const [eva, paul] = back.persons;
    expect(eva.media).toHaveLength(1);
    expect(eva.events[0].mediaIds).toEqual([eva.media[0].id]);
    expect(paul.media).toEqual([]);
    expect(paul.events[0].mediaIds).toEqual([eva.media[0].id]);
  });

  it('leaves media out without the option and notes missing files on import', () => {
    expect(toGedcom(data, '7.0')).not.toContain('OBJE');
    const ged = toGedcom(data, '7.0', new Date(), { media: true });
    const back = parseGedcom(ged);
    expect(back.persons[0].media).toEqual([]);
    expect(back.persons[0].notes.map((n) => n.text)).toContain('Medium (not taken over): media/Muster_Anna/muster_anna_profilbild_1.jpg');
  });

  it('finds files of other programs by relative, Windows or URL-encoded path and by unique name', () => {
    const zipped = ArchiveFiles.fromBuffers({
      'bilder/Oma Anna.jpg': new Uint8Array([1]),
      'scans/urkunde.pdf': new Uint8Array([2]),
      'a/doppelt.jpg': new Uint8Array([3]),
      'b/doppelt.jpg': new Uint8Array([4]),
    });
    expect(resolveMediaFile(zipped, './bilder/Oma%20Anna.jpg')).toBe('bilder/Oma Anna.jpg');
    expect(resolveMediaFile(zipped, 'C:\\Users\\Ahnen\\Scans\\URKUNDE.pdf')).toBe('scans/urkunde.pdf');
    expect(resolveMediaFile(zipped, 'doppelt.jpg')).toBeNull();
    expect(resolveMediaFile(zipped, 'fehlt.jpg')).toBeNull();
  });

  it('exports a GEDZIP file that can be imported again', async () => {
    fs.writeFileSync(path.join(tmpDir, 'p.jpg'), Buffer.from([1, 2, 3]));
    const { zip, missing } = createGedzip(
      data,
      [
        { zipPath: 'media/Muster_Anna/muster_anna_profilbild_1.jpg', diskName: 'p.jpg' },
        { zipPath: 'media/Muster_Anna/muster_anna_taufe_1.pdf', diskName: 'fehlt.pdf' },
      ],
      '7.0',
      new Date(),
    );
    expect(missing).toEqual(['media/Muster_Anna/muster_anna_taufe_1.pdf']);
    const buffer = await collect(zip);
    const entries = unzipSync(buffer);
    expect(Object.keys(entries).sort()).toEqual(['gedcom.ged', 'media/Muster_Anna/muster_anna_profilbild_1.jpg']);
    // The missing file does not appear in the GEDCOM file
    expect(strFromU8(entries['gedcom.ged'])).not.toContain('Taufschein');

    const imported = await readImportFile(fileWith(work, buffer), 'familie.gdz');
    imported.close();
    expect(imported.kind).toBe('GEDCOM');
    expect(imported.data.persons[0].media.map((m) => m.id)).toEqual([portrait]);
    expect(imported.files.names()).toEqual(['media/Muster_Anna/muster_anna_profilbild_1.jpg']);
  });

  it('reads ZIP files of other programs with the GEDCOM file in a subfolder', async () => {
    const ged = ['0 HEAD', '1 GEDC', '2 VERS 5.5.1', '0 @I1@ INDI', '1 NAME Oma /Alt/', '1 OBJE', '2 FILE photos/oma.png', '0 TRLR'].join('\r\n');
    const imported = await readImportFile(zipFileWith(work, { 'export/tree.ged': ged, 'export/photos/oma.png': new Uint8Array([9, 9]) }), 'export.zip');
    const [m] = imported.data.persons[0].media;
    expect(m).toMatchObject({ mimeType: 'image/png', type: 'PHOTO', originalFileName: 'oma.png', sizeBytes: 2 });
    const target = path.join(work, 'oma.png');
    await imported.files.copyTo(m.path, target);
    imported.close();
    expect([...fs.readFileSync(target)]).toEqual([9, 9]);
  });
});
