import fs from 'fs';
import path from 'path';
import { collect, fileWith, removeTestDir, testDir } from '../../../test/archives.js';

const tmpDir = testDir('sources');
const work = testDir('sources-work');
jest.mock('../../files/uploads.js', () => ({ ...jest.requireActual('../../files/uploads.js'), uploadDir: tmpDir }));

import { ArchiveFiles } from '../../files/archive.js';
import { applyPlan } from '../applyPlan.js';
import { buildExport, createZip } from '../exportData.js';
import { FORMAT_VERSION, FORMAT_VERSION_PLAIN, formatVersionOf, validateTransfer, type TransferData, type TransferError } from '../format.js';
import { emptyLibrary, keepExistingLinks, reconcileLibrary, type LibraryKeys, type LibraryState } from '../library.js';
import { analyze, buildPlan } from '../plan.js';
import { readImportFile } from '../readImport.js';
import { prismaMock } from '../../../test/prismaMock.js';
import { person, relation, T1, T2, transfer } from '../../../test/transferFixtures.js';

afterAll(() => {
  removeTestDir(tmpDir);
  removeTestDir(work);
});

beforeEach(() => {
  for (const f of fs.readdirSync(tmpDir)) {
    fs.rmSync(path.join(tmpDir, f), { force: true });
  }
  prismaMock.$transaction.mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)) as never);
});

const repository = (id: string, extra = {}) => ({ id, name: `Archiv ${id}`, isDeleted: false, createdAt: T1, updatedAt: T1, ...extra });
const source = (id: string, extra = {}) => ({
  id,
  type: 'CHURCH_BOOK',
  title: `Kirchenbuch ${id}`,
  author: 'Pfarramt',
  mediaIds: [] as string[],
  isDeleted: false,
  createdAt: T1,
  updatedAt: T1,
  ...extra,
});
const citation = (id: string, sourceId: string, extra = {}) => ({
  id,
  sourceId,
  page: `S. ${id}`,
  mediaIds: [] as string[],
  createdAt: T1,
  updatedAt: T1,
  ...extra,
});
const scan = (id: string) => ({
  id,
  path: `media/sources/${id}.jpg`,
  originalFileName: `${id}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 3,
  type: 'DOCUMENT',
  createdAt: T1,
  updatedAt: T1,
});

/** A family with a marriage entry: it supports the birth of Anna, the wedding and the marriage */
function family(): TransferData {
  return {
    ...transfer(
      [
        person('anna', {
          citations: [{ citationId: 'c1', fact: 'BIRTH' }],
          events: [{ id: 'e1', title: 'Hochzeit', category: 'WEDDING', mediaIds: [], citationIds: ['c1'], createdAt: T1, updatedAt: T1 }],
        }),
        person('otto'),
      ],
      [relation('r1', 'anna', 'otto', 'HUSBAND', { citationIds: ['c1'] })],
    ),
    version: FORMAT_VERSION,
    repositories: [repository('rep1')],
    sources: [source('s1', { repositoryId: 'rep1', mediaIds: ['scan1'] })],
    citations: [citation('c1', 's1', { text: 'Getraut am …', quality: 3, mediaIds: ['scan1'] })],
    libraryMedia: [scan('scan1')],
  };
}

const reason = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return (err as TransferError).reason;
  }
  return 'no error';
};

describe('format', () => {
  it('reads a file of version 2 with archives, sources, citations and their scans', () => {
    const data = validateTransfer(JSON.parse(JSON.stringify(family())));
    expect(data.sources[0]).toMatchObject({ id: 's1', repositoryId: 'rep1', mediaIds: ['scan1'] });
    expect(data.persons[0].citations).toEqual([{ citationId: 'c1', fact: 'BIRTH' }]);
    expect(data.relations[0].citationIds).toEqual(['c1']);
  });

  it('takes unknown source types and facts as the neutral value', () => {
    const raw = family();
    raw.sources[0].type = 'POEM';
    raw.persons[0].citations = [{ citationId: 'c1', fact: 'BURIAL' }];
    const data = validateTransfer(JSON.parse(JSON.stringify(raw)));
    expect(data.sources[0].type).toBe('OTHER');
    expect(data.persons[0].citations[0].fact).toBe('GENERAL');
  });

  it('reports references to citations, sources, archives and scans that the file does not contain', () => {
    const broken = family();
    broken.citations = [citation('c1', 'missing-source', { mediaIds: ['missing-scan'] })];
    broken.sources[0].repositoryId = 'missing-archive';
    broken.relations[0].citationIds = ['missing-citation'];
    let details: string[] = [];
    try {
      validateTransfer(JSON.parse(JSON.stringify(broken)));
    } catch (err) {
      details = (err as TransferError).details;
    }
    expect(details).toEqual(
      expect.arrayContaining([
        'Source s1: archive missing-archive missing',
        'Citation c1: source missing-source missing',
        'Citation c1: medium missing-scan missing',
        'Relation r1: citation missing-citation missing',
      ]),
    );
  });

  it('refuses a file of a newer version', () => {
    expect(reason(() => validateTransfer({ ...family(), version: FORMAT_VERSION + 1 }))).toBe('UNSUPPORTED_VERSION');
  });

  it('writes version 2 only for files with sources, so older versions of the app read the others', () => {
    expect(formatVersionOf(family())).toBe(FORMAT_VERSION);
    expect(formatVersionOf(transfer([person('a')]))).toBe(FORMAT_VERSION_PLAIN);
  });
});

/** The library as the database would answer */
function library(state: Partial<LibraryState>, keys: Partial<Omit<LibraryKeys, 'citationsOf'>> & { citations?: Array<{ id: string; key: string }> } = {}) {
  return {
    state: { ...emptyLibrary(), ...state },
    keys: {
      repositories: keys.repositories ?? [],
      sources: keys.sources ?? [],
      citationsOf: async () => keys.citations ?? [],
    },
  };
}

describe('reconcileLibrary', () => {
  it('uses an existing archive, source and citation with the same content instead of copying them', async () => {
    const result = await reconcileLibrary(
      family(),
      library(
        {},
        {
          repositories: [{ id: 'db-rep', key: 'archiv rep1' }],
          sources: [{ id: 'db-src', key: 'CHURCH_BOOK|kirchenbuch s1|pfarramt' }],
          citations: [{ id: 'db-cit', key: 'db-src|s. c1||getraut am …' }],
        },
      ),
    );
    expect(result.repositories[0].id).toBe('db-rep');
    expect(result.sources[0]).toMatchObject({ id: 'db-src', repositoryId: 'db-rep' });
    expect(result.citations[0]).toMatchObject({ id: 'db-cit', sourceId: 'db-src' });
    expect(result.persons[0].citations).toEqual([{ citationId: 'db-cit', fact: 'BIRTH' }]);
    expect(result.persons[0].events[0].citationIds).toEqual(['db-cit']);
    expect(result.relations[0].citationIds).toEqual(['db-cit']);
  });

  it('keeps records apart when their content occurs twice in the library, and leaves known ids alone', async () => {
    const result = await reconcileLibrary(
      family(),
      library(
        { citations: new Map([['c1', citation('c1', 's1')]]) },
        {
          sources: [
            { id: 'a', key: 'CHURCH_BOOK|kirchenbuch s1|pfarramt' },
            { id: 'b', key: 'CHURCH_BOOK|kirchenbuch s1|pfarramt' },
          ],
        },
      ),
    );
    expect(result.sources[0].id).toBe('s1');
    expect(result.citations[0].id).toBe('c1');
  });
});

describe('keepExistingLinks', () => {
  it('keeps the links of existing records when the file brings none (GEDCOM, version 1)', () => {
    const existing = family();
    const plain = transfer([
      person('anna', { events: [{ id: 'e1', title: 'Hochzeit', category: 'WEDDING', mediaIds: [], citationIds: [], createdAt: T1, updatedAt: T2 }] }),
    ]);

    const result = keepExistingLinks(plain, existing);

    expect(result.persons[0].citations).toEqual([{ citationId: 'c1', fact: 'BIRTH' }]);
    expect(result.persons[0].events[0].citationIds).toEqual(['c1']);
    // The citation and its source come along unchanged, so nothing refers to records the file lacks
    expect(result.citations.map((c) => c.id)).toEqual(['c1']);
    expect(result.sources.map((s) => s.id)).toEqual(['s1']);
    expect(result.repositories.map((r) => r.id)).toEqual(['rep1']);
  });

  it('changes nothing when the existing records have no links', () => {
    const plain = transfer([person('anna')]);
    expect(keepExistingLinks(plain, transfer([person('anna')]))).toBe(plain);
  });
});

describe('analyze and buildPlan', () => {
  const known = (updatedAt: string) =>
    ({
      ...emptyLibrary(),
      sources: new Map([['s1', { ...source('s1', { repositoryId: 'rep1', mediaIds: ['scan1'] }), title: 'Alter Titel', updatedAt }]]),
      repositories: new Map([['rep1', repository('rep1')]]),
    }) as LibraryState;

  it('adds new records of the library and updates changed ones: overwriting takes the file, merging the newer one', () => {
    const imported = family();
    const older = analyze(imported, transfer([]), known(T2));
    expect(older.library.sources.changed).toHaveLength(1);
    expect(older.library.repositories.changed).toHaveLength(0);
    expect(older.library.citations.created.map((c) => c.id)).toEqual(['c1']);

    expect(buildPlan(imported, older, 'MERGE_NEWER').updateSources).toEqual([]);
    expect(buildPlan(imported, older, 'MERGE_MANUAL').updateSources).toEqual([]);
    expect(buildPlan(imported, older, 'OVERWRITE').updateSources.map((s) => s.id)).toEqual(['s1']);

    const newer = analyze({ ...imported, sources: [{ ...imported.sources[0], updatedAt: T2 }] }, transfer([]), known(T1));
    expect(buildPlan(imported, newer, 'MERGE_NEWER').updateSources.map((s) => s.id)).toEqual(['s1']);
    const plan = buildPlan(imported, newer, 'MERGE_NEWER');
    expect(plan.createCitations.map((c) => c.id)).toEqual(['c1']);
    expect(plan.createLibraryMedia.map((c) => c.record.id)).toEqual(['scan1']);
  });

  it('shows a changed citation of a person as a change of that person', () => {
    const existing = transfer([person('anna')]);
    const imported = transfer([person('anna', { citations: [{ citationId: 'c1', fact: 'BIRTH' }], updatedAt: T2 })]);
    const analysis = analyze(imported, existing);
    expect(analysis.conflicts[0].changes).toEqual([{ field: 'citations', existing: [], imported: [{ citationId: 'c1', fact: 'BIRTH' }] }]);
    expect(buildPlan(imported, analysis, 'MERGE_NEWER').updatePersons.map((p) => p.id)).toEqual(['anna']);
  });
});

const archiveOf = (files: Record<string, Uint8Array>) => ArchiveFiles.fromBuffers(files);

describe('applyPlan with the library', () => {
  it('writes archive, source, scan and citation into the library and links them with the new persons, events and relations', async () => {
    const imported = family();
    const plan = buildPlan(imported, analyze(imported, transfer([])), 'MERGE_NEWER');
    prismaMock.media.findMany.mockResolvedValue([{ id: 'scan1' }] as never);

    await applyPlan(prismaMock as never, plan, archiveOf({ 'media/sources/scan1.jpg': new Uint8Array([1, 2, 3]) }), { treeId: 't1' });

    expect(prismaMock.repository.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: 'rep1', name: 'Archiv rep1' })] });
    expect(prismaMock.source.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: 's1', repositoryId: 'rep1' })] });
    expect(prismaMock.citation.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: 'c1', sourceId: 's1', quality: 3 })] });
    // The scan belongs to the library: no family tree, no person
    const scans = prismaMock.media.createMany.mock.calls.flatMap(
      (call) => call[0]!.data as Array<{ id: string; familyTreeId: string | null; personId: string | null }>,
    );
    expect(scans.find((m) => m.id === 'scan1')).toMatchObject({ familyTreeId: null, personId: null });
    expect(prismaMock.sourceMedia.createMany).toHaveBeenCalledWith({ data: [{ sourceId: 's1', mediaId: 'scan1' }], skipDuplicates: true });
    expect(prismaMock.citationMedia.createMany).toHaveBeenCalledWith({ data: [{ citationId: 'c1', mediaId: 'scan1' }], skipDuplicates: true });
    expect(prismaMock.personCitation.createMany).toHaveBeenCalledWith({ data: [{ personId: 'anna', citationId: 'c1', fact: 'BIRTH' }], skipDuplicates: true });
    expect(prismaMock.eventCitation.createMany).toHaveBeenCalledWith({ data: [{ eventId: 'e1', citationId: 'c1' }], skipDuplicates: true });
    expect(prismaMock.relationCitation.createMany).toHaveBeenCalledWith({ data: [{ relationId: 'r1', citationId: 'c1' }], skipDuplicates: true });
    // The library comes first: the links refer to its citations
    expect(prismaMock.citation.createMany.mock.invocationCallOrder[0]).toBeLessThan(prismaMock.person.createMany.mock.invocationCallOrder[0]);
  });

  it('replaces the links of an updated person with those of the file and never deletes anything of the library', async () => {
    const imported = transfer([person('anna', { citations: [{ citationId: 'c2', fact: 'DEATH' }], updatedAt: T2 })]);
    const plan = buildPlan(imported, analyze(imported, transfer([person('anna')])), 'OVERWRITE');
    prismaMock.media.findMany.mockResolvedValue([]);
    prismaMock.person.deleteMany.mockResolvedValue({ count: 1 });

    await applyPlan(prismaMock as never, plan, archiveOf({}), { treeId: 't1' });

    expect(prismaMock.personCitation.createMany).toHaveBeenCalledWith({ data: [{ personId: 'anna', citationId: 'c2', fact: 'DEATH' }], skipDuplicates: true });
    expect(prismaMock.source.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.citation.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.repository.deleteMany).not.toHaveBeenCalled();

    const merge = buildPlan(imported, analyze(imported, transfer([person('anna', { citations: [{ citationId: 'c1', fact: 'BIRTH' }] })])), 'MERGE_NEWER');
    await applyPlan(prismaMock as never, merge, archiveOf({}), { treeId: 't1' });
    expect(prismaMock.personCitation.deleteMany).toHaveBeenCalledWith({ where: { personId: 'anna', NOT: [{ citationId: 'c2', fact: 'DEATH' }] } });
  });
});

describe('export of the library', () => {
  it('takes from the library exactly what the persons of the family tree use, with their scans', async () => {
    const at = new Date(T1);
    const stamps = { createdAt: at, updatedAt: at, deletedAt: null };
    prismaMock.person.findMany.mockResolvedValue([
      {
        ...person('anna'),
        ...stamps,
        notes: [],
        media: [
          {
            id: 'own-photo',
            fileName: 'own.jpg',
            originalFileName: 'Taufschein.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: BigInt(3),
            type: 'DOCUMENT',
            ...stamps,
          },
        ],
        citations: [{ citationId: 'c1', fact: 'BIRTH' }],
        events: [{ id: 'e1', title: 'Taufe', category: 'BAPTISM', media: [], citations: [{ citationId: 'c2' }], ...stamps }],
      },
    ] as never);
    prismaMock.relation.findMany.mockResolvedValue([]);
    prismaMock.citation.findMany.mockResolvedValue([
      { ...citation('c1', 's1'), ...stamps, media: [{ mediaId: 'scan1' }, { mediaId: 'other-tree' }] },
      { ...citation('c2', 's1'), ...stamps, media: [{ mediaId: 'own-photo' }] },
    ] as never);
    prismaMock.source.findMany.mockResolvedValue([{ ...source('s1', { repositoryId: 'rep1' }), ...stamps, media: [] }] as never);
    prismaMock.repository.findMany.mockResolvedValue([{ ...repository('rep1'), ...stamps }] as never);
    prismaMock.media.findMany.mockResolvedValue([
      { ...scan('scan1'), fileName: 'stored.jpg', originalFileName: 'Seite 12.jpg', sizeBytes: BigInt(3), ...stamps },
    ] as never);

    const { data, files } = await buildExport(prismaMock as never, 't1');

    expect(prismaMock.citation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['c1', 'c2'] } } }));
    // Scans of the library only – files of other family trees stay out
    expect(prismaMock.media.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['scan1', 'other-tree'] }, familyTreeId: null } }));
    expect(data.version).toBe(FORMAT_VERSION);
    expect(data.citations.map((c) => [c.id, c.mediaIds])).toEqual([
      ['c1', ['scan1']],
      ['c2', ['own-photo']],
    ]);
    expect(data.persons[0].citations).toEqual([{ citationId: 'c1', fact: 'BIRTH' }]);
    expect(data.persons[0].events[0].citationIds).toEqual(['c2']);
    expect(data.libraryMedia).toEqual([expect.objectContaining({ id: 'scan1', path: 'media/sources/seite_12_scan1.jpg' })]);
    expect(files).toContainEqual({ zipPath: 'media/sources/seite_12_scan1.jpg', diskName: 'stored.jpg' });
  });

  it('writes the scans of the library into the ZIP file and reads everything back', async () => {
    fs.writeFileSync(path.join(tmpDir, 'stored-scan.jpg'), 'abc');
    const data = family();
    const { zip } = createZip(data, [{ zipPath: 'media/sources/scan1.jpg', diskName: 'stored-scan.jpg' }], true);
    const back = await readImportFile(fileWith(work, await collect(zip)), 'export.zip');
    try {
      expect(back.data.version).toBe(FORMAT_VERSION);
      expect(back.data.libraryMedia.map((m) => m.id)).toEqual(['scan1']);
      expect(back.data.citations[0]).toMatchObject({ id: 'c1', mediaIds: ['scan1'] });
      expect(back.files.has('media/sources/scan1.jpg')).toBe(true);
    } finally {
      back.close();
    }
  });

  it('drops the links to scans whose file is missing', async () => {
    const { zip, missing } = createZip(family(), [{ zipPath: 'media/sources/scan1.jpg', diskName: 'not-there.jpg' }], true);
    const back = await readImportFile(fileWith(work, await collect(zip)), 'export.zip');
    back.close();
    expect(missing).toEqual(['media/sources/scan1.jpg']);
    expect(back.data.libraryMedia).toEqual([]);
    expect(back.data.sources[0].mediaIds).toEqual([]);
    expect(back.data.citations[0].mediaIds).toEqual([]);
  });
});
