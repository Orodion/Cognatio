import { parseGedcom, toGedcom, type MediaFiles } from '../gedcom.js';
import { validateTransfer, type TransferData } from '../format.js';
import { person, relation, T1, transfer } from '../../../test/transferFixtures.js';

/** A file of another program (5.5.1) with archives, sources and citations at many places */
const FOREIGN = [
  '0 HEAD',
  '1 GEDC',
  '2 VERS 5.5.1',
  '1 CHAR UTF-8',
  '0 @R1@ REPO',
  '1 NAME Kirchenbuchamt Mainz',
  '1 ADDR Domplatz 1',
  '2 CITY Mainz',
  '1 WWW https://example.org/kb',
  '0 @R2@ REPO',
  '1 NAME Stadtarchiv',
  '0 @S1@ SOUR',
  '1 TITL Taufbuch St. Martin',
  '1 AUTH Pfarramt',
  '1 ABBR TB Martin',
  '1 REPO @R1@',
  '2 CALN KB 12',
  '1 REPO @R2@',
  '2 CALN Film 7',
  '0 @S2@ SOUR',
  '1 TITL Volkszählung 1900',
  '1 _CALN VZ 1900',
  '0 @I1@ INDI',
  '1 NAME Johann /Muster/',
  '2 SOUR @S1@',
  '3 PAGE S. 3',
  '1 SEX M',
  '1 BIRT',
  '2 DATE 1 JAN 1850',
  '2 SOUR @S1@',
  '3 PAGE Nr. 117',
  '3 DATA',
  '4 DATE 3 JAN 1850',
  '4 TEXT Getauft am 3. Januar',
  '3 QUAY 3',
  '1 CENS',
  '2 DATE 1900',
  '2 SOUR @S2@',
  '3 PAGE Haushalt 4',
  '3 QUAY 9',
  '1 SOUR Mündliche Überlieferung der Familie',
  '1 FAMS @F1@',
  '1 ASSO @I3@',
  '2 RELA Pate',
  '2 SOUR @S1@',
  '3 PAGE Nr. 117',
  '3 DATA',
  '4 DATE 3 JAN 1850',
  '4 TEXT Getauft am 3. Januar',
  '0 @I2@ INDI',
  '1 NAME Anna /Muster/',
  '1 SEX F',
  '1 FAMS @F1@',
  '0 @I3@ INDI',
  '1 NAME Karl /Muster/',
  '1 FAMC @F1@',
  '2 SOUR @S1@',
  '3 PAGE Nr. 200',
  '0 @F1@ FAM',
  '1 HUSB @I1@',
  '1 WIFE @I2@',
  '1 CHIL @I3@',
  '1 MARR',
  '2 DATE 1875',
  '2 SOUR @S1@',
  '3 PAGE Trauungen S. 9',
  '0 TRLR',
].join('\n');

const byName = (data: TransferData, firstName: string) => data.persons.find((p) => p.firstName === firstName)!;
const citation = (data: TransferData, id: string) => data.citations.find((c) => c.id === id)!;
const sourceOf = (data: TransferData, citationId: string) => data.sources.find((s) => s.id === citation(data, citationId).sourceId)!;

describe('GEDCOM import of sources', () => {
  const data = validateTransfer(parseGedcom(FOREIGN, undefined, 'de'));

  it('takes archives and sources as records of the library; a second archive goes into the note', () => {
    expect(data.repositories.map((r) => [r.name, r.address, r.url])).toEqual([
      ['Kirchenbuchamt Mainz', 'Domplatz 1\nMainz', 'https://example.org/kb'],
      ['Stadtarchiv', null, null],
    ]);
    const taufbuch = data.sources.find((s) => s.title === 'Taufbuch St. Martin')!;
    expect(taufbuch).toMatchObject({ author: 'Pfarramt', abbreviation: 'TB Martin', callNumber: 'KB 12', note: 'REPO: Stadtarchiv, Film 7', type: 'OTHER' });
    expect(taufbuch.repositoryId).toBe(data.repositories[0].id);
    expect(data.sources.find((s) => s.title === 'Volkszählung 1900')).toMatchObject({ repositoryId: null, callNumber: 'VZ 1900' });
  });

  it('links the citations with name, birth, events and the person as a whole', () => {
    const johann = byName(data, 'Johann');
    const facts = Object.fromEntries(johann.citations.map((c) => [c.fact, c.citationId]));
    expect(Object.keys(facts).sort()).toEqual(['BIRTH', 'GENERAL', 'NAME']);
    expect(citation(data, facts.NAME)).toMatchObject({ page: 'S. 3' });
    expect(citation(data, facts.BIRTH)).toMatchObject({ page: 'Nr. 117', date: '03.01.1850', text: 'Getauft am 3. Januar', quality: 3 });
    // A source written as text at the fact (5.5.1) becomes a source of its own
    expect(sourceOf(data, facts.GENERAL)).toMatchObject({ title: 'Mündliche Überlieferung der Familie', type: 'OTHER' });
    const census = johann.events.find((e) => e.title === 'Volkszählung')!;
    expect(census.citationIds).toHaveLength(1);
    // QUAY outside 0–3 is no rating
    expect(citation(data, census.citationIds[0])).toMatchObject({ page: 'Haushalt 4', quality: null });
  });

  it('makes equal citations one citation with several facts', () => {
    const johann = byName(data, 'Johann');
    const birth = johann.citations.find((c) => c.fact === 'BIRTH')!.citationId;
    const godparent = data.relations.find((r) => r.type === 'OTHER')!;
    expect(godparent.citationIds).toEqual([birth]);
    expect(data.citations.filter((c) => c.page === 'Nr. 117')).toHaveLength(1);
  });

  it('gives the citations of a family to the partnership and those below FAMC to the parent-child relations', () => {
    const id = (name: string) => byName(data, name).id;
    const marriage = data.relations.find((r) => r.personAId === id('Johann') && r.personBId === id('Anna'))!;
    expect(citation(data, marriage.citationIds[0])).toMatchObject({ page: 'Trauungen S. 9' });
    const parents = data.relations.filter((r) => r.type === 'CHILD' && r.personBId === id('Karl'));
    expect(parents).toHaveLength(2);
    for (const r of parents) {
      expect(r.citationIds.map((c) => citation(data, c).page)).toEqual(['Nr. 200']);
    }
  });

  it('keeps no source as a note any more', () => {
    expect(data.persons.flatMap((p) => p.notes.map((n) => n.text)).some((t) => t.startsWith('Quelle'))).toBe(false);
  });
});

describe('GEDCOM round trip of sources', () => {
  const stamp = T1;
  const library = (): TransferData => ({
    ...transfer(
      [
        person('anna', {
          firstName: 'Anna',
          birthDate: '01.02.1900',
          citations: [
            { citationId: 'c1', fact: 'BIRTH' },
            { citationId: 'c2', fact: 'GENERAL' },
          ],
          events: [{ id: 'e1', title: 'Hochzeit', category: 'WEDDING', mediaIds: [], citationIds: ['c1'], createdAt: stamp, updatedAt: stamp }],
        }),
        person('otto', { firstName: 'Otto', gender: 'MALE', citations: [{ citationId: 'c1', fact: 'NAME' }] }),
        person('kind', { firstName: 'Kind' }),
      ],
      [relation('r1', 'otto', 'anna', 'WIFE', { citationIds: ['c1'] }), relation('r2', 'anna', 'kind', 'CHILD', { citationIds: ['c3'] })],
    ),
    repositories: [
      {
        id: 'rep1',
        name: 'Standesamt',
        address: 'Markt 1',
        url: 'https://example.org',
        email: null,
        phone: null,
        note: null,
        isDeleted: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    sources: [
      {
        id: 's1',
        type: 'CIVIL_REGISTER',
        title: 'Heiratsregister 1925',
        author: 'Standesamt',
        publication: null,
        abbreviation: 'HR 1925',
        text: null,
        repositoryId: 'rep1',
        callNumber: 'HR 25',
        note: 'Gut lesbar',
        mediaIds: [],
        isDeleted: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
      { id: 's2', type: 'LETTER', title: 'Brief der Tante', callNumber: 'Mappe 3', mediaIds: [], isDeleted: false, createdAt: stamp, updatedAt: stamp },
      { id: 's3', type: 'BOOK', title: 'Im Papierkorb', mediaIds: [], isDeleted: true, createdAt: stamp, updatedAt: stamp },
    ],
    citations: [
      {
        id: 'c1',
        sourceId: 's1',
        page: 'Nr. 12',
        date: '03.05.1925',
        datePrecision: 'EXACT',
        text: 'Heute erschienen …\nzweite Zeile',
        quality: 3,
        note: 'Randvermerk',
        mediaIds: [],
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: 'c2',
        sourceId: 's2',
        page: null,
        date: null,
        datePrecision: null,
        text: null,
        quality: 1,
        note: null,
        mediaIds: [],
        createdAt: stamp,
        updatedAt: stamp,
      },
      { id: 'c3', sourceId: 's3', page: 'S. 1', mediaIds: [], createdAt: stamp, updatedAt: stamp },
    ],
  });

  it.each(['5.5.1', '7.0'] as const)('keeps archives, sources, citations and their facts (%s)', (version) => {
    const text = toGedcom(library(), version, new Date(stamp));
    const back = validateTransfer(parseGedcom(text));

    expect(back.repositories).toEqual([expect.objectContaining({ id: 'rep1', name: 'Standesamt', address: 'Markt 1', url: 'https://example.org' })]);
    expect(back.sources.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    expect(back.sources.find((s) => s.id === 's1')).toMatchObject({
      type: 'CIVIL_REGISTER',
      title: 'Heiratsregister 1925',
      author: 'Standesamt',
      abbreviation: 'HR 1925',
      repositoryId: 'rep1',
      callNumber: 'HR 25',
      note: 'Gut lesbar',
    });
    expect(back.sources.find((s) => s.id === 's2')).toMatchObject({ type: 'LETTER', callNumber: 'Mappe 3', repositoryId: null });
    // One citation again, though written out at every fact it supports
    expect(back.citations.find((c) => c.id === 'c1')).toMatchObject({
      sourceId: 's1',
      page: 'Nr. 12',
      date: '03.05.1925',
      text: 'Heute erschienen …\nzweite Zeile',
      quality: 3,
      note: 'Randvermerk',
    });
    const anna = back.persons.find((p) => p.id === 'anna')!;
    expect(anna.citations).toEqual([
      { citationId: 'c1', fact: 'BIRTH' },
      { citationId: 'c2', fact: 'GENERAL' },
    ]);
    expect(anna.events[0].citationIds).toEqual(['c1']);
    expect(back.persons.find((p) => p.id === 'otto')!.citations).toEqual([{ citationId: 'c1', fact: 'NAME' }]);
    const marriage = back.relations.find((r) => [r.personAId, r.personBId].sort().join() === 'anna,otto')!;
    expect(marriage.citationIds).toEqual(['c1']);
    // The source in the recycle bin and its citation stay out
    expect(back.citations.map((c) => c.id)).not.toContain('c3');
    expect(text).not.toContain('Im Papierkorb');
  });

  it('writes the kind of source and the call number without archive as documented extensions in GEDCOM 7', () => {
    const text = toGedcom(library(), '7.0', new Date(stamp));
    expect(text).toContain('2 TAG _STYPE ');
    expect(text).toContain('2 TAG _CALN ');
    expect(text).toContain('1 _STYPE LETTER');
    expect(text).toContain('1 _CALN Mappe 3');
  });

  it('takes scans of sources and citations from a GEDZIP file into the library', () => {
    const scans = ['media/sources/titel.jpg', 'media/sources/seite.jpg'];
    const files: MediaFiles = { names: () => scans, has: (n) => scans.includes(n), size: () => 3 };
    const data = library();
    data.libraryMedia = [
      {
        id: 'm1',
        path: scans[0],
        originalFileName: 'Titelblatt.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
        type: 'DOCUMENT',
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: 'm2',
        path: scans[1],
        originalFileName: 'Seite 12.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
        type: 'DOCUMENT',
        createdAt: stamp,
        updatedAt: stamp,
      },
    ];
    data.sources[0].mediaIds = ['m1'];
    data.citations[0].mediaIds = ['m2'];

    const back = validateTransfer(parseGedcom(toGedcom(data, '7.0', new Date(stamp), { media: true }), files));

    expect(back.libraryMedia.map((m) => [m.id, m.path]).sort()).toEqual([
      ['m1', scans[0]],
      ['m2', scans[1]],
    ]);
    expect(back.sources.find((s) => s.id === 's1')!.mediaIds).toEqual(['m1']);
    expect(back.citations.find((c) => c.id === 'c1')!.mediaIds).toEqual(['m2']);
  });
});
