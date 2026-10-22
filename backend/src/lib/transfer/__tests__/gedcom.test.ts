import { fromGedcomDate, gedcomDateToIso, toGedcomDate } from '../gedcomDate.js';
import { parseGedcom, parseGedcomTree, toGedcom } from '../gedcom.js';
import { validateTransfer } from '../format.js';
import { person, relation, transfer } from '../../../test/transferFixtures.js';

describe('GEDCOM dates', () => {
  it.each([
    ['04.01.1980', '4 JAN 1980'],
    ['1980-01-04', '4 JAN 1980'],
    ['01.1980', 'JAN 1980'],
    ['1980', '1980'],
    ['um 1980', 'ABT 1980'],
    ['ca. 01.1980', 'ABT JAN 1980'],
    ['nach 1980', 'AFT 1980'],
    ['vor 04.01.1980', 'BEF 4 JAN 1980'],
    ['1980-1985', 'BET 1980 AND 1985'],
    // The words of every language of the interface
    ['about 1880', 'ABT 1880'],
    ['ca.1880', 'ABT 1880'],
    ['~1880', 'ABT 1880'],
    ['vers 1880', 'ABT 1880'],
    ['intorno al 1880', 'ABT 1880'],
    ['cerca de 1880', 'ABT 1880'],
    ['близько 1880', 'ABT 1880'],
    ['après 1900', 'AFT 1900'],
    ['después de 1900', 'AFT 1900'],
    ['na 1900', 'AFT 1900'],
    ['після 1900', 'AFT 1900'],
    ['przed 1900', 'BEF 1900'],
    ['prima del 1900', 'BEF 1900'],
    ['vóór 1900', 'BEF 1900'],
    ['до 1900', 'BEF 1900'],
  ])('app %s → GEDCOM %s', (app, gedcom) => {
    expect(toGedcomDate(app)).toEqual({ date: gedcom });
  });

  it('keeps unrecognised input as phrase', () => {
    expect(toGedcomDate('Ostern 1912')).toEqual({ phrase: 'Ostern 1912' });
    expect(toGedcomDate('')).toBeNull();
  });

  it.each([
    ['4 JAN 1980', '04.01.1980', 'EXACT'],
    ['JAN 1980', '01.1980', 'MONTH'],
    ['1980', '1980', 'YEAR'],
    ['ABT 1980', 'um 1980', 'APPROXIMATE'],
    ['EST 1980', 'um 1980', 'APPROXIMATE'],
    ['AFT JAN 1980', 'nach 01.1980', 'APPROXIMATE'],
    ['BEF 1980', 'vor 1980', 'APPROXIMATE'],
    ['BET 1980 AND 1985', '1980-1985', 'APPROXIMATE'],
    ['FROM 1980 TO 1985', '1980-1985', 'APPROXIMATE'],
    ['@#DGREGORIAN@ 4 JAN 1980', '04.01.1980', 'EXACT'],
    ['INT 1980 (Weihnachten)', '1980', 'YEAR'],
    ['(Ostern 1912)', 'Ostern 1912', null],
    ['@#DJULIAN@ 1700', '@#DJULIAN@ 1700', null],
  ])('GEDCOM %s → app %s', (gedcom, app, precision) => {
    expect(fromGedcomDate(gedcom, 'de')).toMatchObject({ value: app, precision });
  });

  it('converts the start of a date to a timestamp for relations', () => {
    expect(gedcomDateToIso('JUN 1950')).toBe('1950-06-01T00:00:00.000Z');
    expect(gedcomDateToIso('irgendwann')).toBeNull();
  });
});

describe('parseGedcomTree', () => {
  it('joins CONC/CONT lines and rejects malformed files', () => {
    const [, note] = parseGedcomTree('0 HEAD\n0 @N1@ NOTE Erste\n1 CONC  Zeile\n1 CONT Zweite');
    expect(note.value).toBe('Erste Zeile\nZweite');
    expect(() => parseGedcomTree('0 INDI\n')).toThrow('INVALID_GEDCOM');
    expect(() => parseGedcomTree('0 HEAD\n2 SOUR x')).toThrow('INVALID_GEDCOM');
    expect(() => parseGedcomTree('0 HEAD\nkein gedcom')).toThrow('INVALID_GEDCOM');
  });
});

describe('parseGedcom (fremde Datei)', () => {
  const ged = [
    '0 HEAD',
    '1 GEDC',
    '2 VERS 5.5.1',
    '1 CHAR UTF-8',
    '0 @I1@ INDI',
    '1 NAME Johann Georg /Müller/',
    '2 NPFX Dr.',
    '1 NAME /Schmidt/',
    '2 TYPE maiden',
    '1 SEX M',
    '1 BIRT',
    '2 DATE ABT 1850',
    '2 PLAC Mainz',
    '1 BAPM',
    '2 DATE 3 MAR 1850',
    '1 OCCU Bäcker',
    '1 NOTE @N1@',
    '1 SOUR @S1@',
    '1 TITL Freiherr',
    '1 FAMS @F1@',
    '0 @I2@ INDI',
    '1 NAME Anna /Weber/',
    '1 SEX F',
    '1 DEAT',
    '2 DATE 1920',
    '0 @I3@ INDI',
    '1 NAME Karl /Müller/',
    '1 FAMC @F1@',
    '2 PEDI adopted',
    '1 ASSO @I2@',
    '2 RELA Patin',
    '0 @F1@ FAM',
    '1 HUSB @I1@',
    '1 WIFE @I2@',
    '1 CHIL @I3@',
    '1 MARR',
    '2 DATE 12 JUN 1875',
    '2 PLAC Mainz',
    '0 @N1@ NOTE Lebte in',
    '1 CONT Mainz',
    '0 @S1@ SOUR',
    '1 TITL Kirchenbuch Mainz',
    '0 TRLR',
  ].join('\n');
  const data = validateTransfer(parseGedcom(ged, undefined, 'de'));
  const byName = (firstName: string) => data.persons.find((p) => p.firstName === firstName)!;

  it('maps individuals to persons', () => {
    expect(byName('Johann')).toMatchObject({
      middleName: 'Georg',
      lastName: 'Müller',
      birthName: 'Schmidt',
      title: 'Dr.',
      gender: 'MALE',
      birthDate: 'um 1850',
      birthDatePrecision: 'APPROXIMATE',
      birthPlace: 'Mainz',
      occupation: 'Bäcker',
    });
    expect(byName('Anna')).toMatchObject({ gender: 'FEMALE', deathDate: '1920', deathDatePrecision: 'YEAR' });
    expect(data.source).toBe('GEDCOM 5.5.1');
  });

  it('turns standard events into timeline events and unknown fields into notes', () => {
    const johann = byName('Johann');
    expect(johann.events).toEqual([expect.objectContaining({ category: 'BAPTISM', mediaIds: [], citationIds: [], title: 'Taufe', date: '03.03.1850' })]);
    expect(johann.notes.map((n) => n.text)).toEqual(['Lebte in\nMainz', 'TITL: Freiherr']);
    // The source is no longer a note but a source of the library with a citation of the person
    const [citation] = johann.citations;
    expect(citation.fact).toBe('GENERAL');
    const sourceId = data.citations.find((c) => c.id === citation.citationId)!.sourceId;
    expect(data.sources.find((s) => s.id === sourceId)).toMatchObject({ title: 'Kirchenbuch Mainz' });
  });

  it('builds relations from families and associations', () => {
    const id = (firstName: string) => byName(firstName).id;
    const rel = (a: string, b: string) => data.relations.find((r) => r.personAId === id(a) && r.personBId === id(b));
    expect(rel('Johann', 'Anna')).toMatchObject({ type: 'WIFE', startDate: '1875-06-12T00:00:00.000Z', note: 'Hochzeit in Mainz' });
    expect(rel('Johann', 'Karl')).toMatchObject({ type: 'CHILD', label: 'Adoptivkind' });
    expect(rel('Anna', 'Karl')).toMatchObject({ type: 'CHILD' });
    expect(rel('Karl', 'Anna')).toMatchObject({ type: 'OTHER', label: 'Patin' });
  });
});

describe('GEDCOM roundtrip (Export → Import)', () => {
  const stamp = '2026-01-01T00:00:00.000Z';
  const father = person('father', {
    firstName: 'Max',
    middleName: 'Peter',
    lastName: 'Muster',
    title: 'Dr.',
    nickname: 'Maxi',
    gender: 'MALE',
    birthDate: '04.01.1950',
    birthDatePrecision: 'EXACT',
    birthPlace: 'Köln',
    deathDate: 'um 2020',
    deathDatePrecision: 'APPROXIMATE',
    occupation: 'Lehrer',
    nationality: 'deutsch',
    address: 'Hauptstr. 1\n50667 Köln',
    phone: '0221 123',
    email: 'max@example.org',
    hobbies: 'Angeln',
    maritalStatus: 'MARRIED',
    languages: ['de', 'en'],
    events: [
      {
        id: 'e1',
        title: 'Umzug nach Bonn',
        category: 'MOVE',
        mediaIds: [],
        citationIds: [],
        date: '1980-1985',
        datePrecision: 'APPROXIMATE',
        place: 'Bonn',
        description: 'mit Familie',
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    notes: [{ id: 'n1', text: `Lange Notiz ${'x'.repeat(400)}\nzweite Zeile`, createdAt: stamp, updatedAt: stamp }],
  });
  const mother = person('mother', { firstName: 'Erika', birthName: 'Schmidt', gender: 'FEMALE' });
  const kind = person('kind', { firstName: 'Lea', gender: 'FEMALE' });
  const pate = person('pate', { firstName: 'Paul' });
  const deleted = person('deleted', { firstName: 'Weg', isDeleted: true });
  const data = transfer(
    [father, mother, kind, pate, deleted],
    [
      relation('r1', 'father', 'mother', 'WIFE', { startDate: '1975-06-12T00:00:00.000Z', note: 'Standesamt' }),
      relation('r2', 'kind', 'mother', 'MOTHER', { label: 'Adoptivkind' }),
      relation('r3', 'father', 'kind', 'CHILD', { label: 'Adoptivkind' }),
      relation('r4', 'kind', 'pate', 'OTHER', { label: 'Pate' }),
      // In the recycle bin: neither a family nor an association
      relation('r5', 'mother', 'pate', 'HUSBAND', { active: false }),
      relation('r6', 'father', 'pate', 'OTHER', { label: 'Nachbar', active: false }),
    ],
  );

  it.each(['5.5.1', '7.0'] as const)('keeps all mappable information (GEDCOM %s)', (version) => {
    const ged = toGedcom(data, version);
    if (version === '5.5.1') {
      expect(ged.split('\r\n').every((l) => l.length <= 255)).toBe(true);
    }
    const back = validateTransfer(parseGedcom(ged, undefined, 'de'));
    expect(back.source).toBe(`GEDCOM ${version}`);
    // The recycle bin is not exported
    expect(back.persons.map((p) => p.firstName).sort()).toEqual(['Erika', 'Lea', 'Max', 'Paul']);

    const max = back.persons.find((p) => p.firstName === 'Max')!;
    // All person fields except id, timestamps and sub-records must be preserved
    const fields = Object.fromEntries(Object.entries(father).filter(([key]) => !['id', 'events', 'notes', 'media', 'createdAt', 'updatedAt'].includes(key)));
    expect(max).toMatchObject(fields);
    expect(max.events[0]).toMatchObject({
      title: 'Umzug nach Bonn',
      category: 'MOVE',
      mediaIds: [],
      citationIds: [],
      date: '1980-1985',
      place: 'Bonn',
      description: 'mit Familie',
    });
    expect(max.notes[0].text).toBe(father.notes[0].text);
    expect(back.persons.find((p) => p.firstName === 'Erika')!.birthName).toBe('Schmidt');

    const id = (firstName: string) => back.persons.find((p) => p.firstName === firstName)!.id;
    const rel = (a: string, b: string) => back.relations.find((r) => r.personAId === id(a) && r.personBId === id(b));
    expect(rel('Max', 'Erika')).toMatchObject({ type: 'WIFE', startDate: '1975-06-12T00:00:00.000Z', note: 'Standesamt' });
    expect(rel('Max', 'Lea')).toMatchObject({ type: 'CHILD', label: 'Adoptivkind' });
    expect(rel('Erika', 'Lea')).toMatchObject({ type: 'CHILD', label: 'Adoptivkind' });
    expect(rel('Lea', 'Paul')).toMatchObject({ type: 'OTHER', label: 'Pate' });
    // Relations in the recycle bin are not exported
    expect(back.relations).toHaveLength(4);
  });

  it.each(['5.5.1', '7.0'] as const)('writes baptism, occupation and residence as standard tags and reads every kind back (GEDCOM %s)', (version) => {
    const event = (id: string, title: string, category: string, date: string | null) => ({
      id,
      title,
      category,
      date,
      datePrecision: date ? 'YEAR' : null,
      mediaIds: [],
      citationIds: [],
      createdAt: stamp,
      updatedAt: stamp,
    });
    const events = [
      event('b', 'Taufe in St. Nikolai', 'BAPTISM', '1900'),
      event('o', 'Schmied', 'OCCUPATION', '1920'),
      event('m', 'Umzug nach Bonn', 'MOVE', '1930'),
      event('s', 'Einschulung', 'SCHOOL_START', '1906'),
      event('w', 'Hochzeit', 'WEDDING', '1925'),
      event('x', 'Auswanderung', 'OTHER', null),
    ];
    const withJob = person('a', { firstName: 'Anna', occupation: 'Bäuerin', events });
    // An occupation without a date and without an occupation of the person stays EVEN – the import would take it as that
    const withoutJob = person('k', { firstName: 'Karl', events: [event('u', 'Knecht', 'OCCUPATION', null)] });
    const ged = toGedcom(transfer([withJob, withoutJob], []), version);
    const lines = (...l: string[]) => l.join('\r\n');
    expect(ged).toContain(lines('1 BAPM', '2 TYPE Taufe in St. Nikolai', '2 DATE 1900'));
    expect(ged).toContain(lines('1 OCCU Schmied', '2 DATE 1920'));
    expect(ged).toContain(lines('1 RESI', '2 TYPE Umzug nach Bonn'));
    expect(ged).toContain(lines('1 EVEN Hochzeit', '2 TYPE WEDDING'));
    expect(ged).toContain(lines('1 EVEN Knecht', '2 TYPE OCCUPATION'));

    const back = parseGedcom(ged, undefined, 'de');
    const anna = back.persons.find((p) => p.firstName === 'Anna')!;
    expect(anna.occupation).toBe('Bäuerin');
    expect(anna.events.map((e) => [e.title, e.category, e.date])).toEqual(events.map((e) => [e.title, e.category, e.date]));
    const karl = back.persons.find((p) => p.firstName === 'Karl')!;
    expect(karl.occupation ?? null).toBeNull();
    expect(karl.events.map((e) => [e.title, e.category])).toEqual([['Knecht', 'OCCUPATION']]);
  });

  it('takes an occupation with a date of another program as a life event', () => {
    const ged = ['0 HEAD', '1 GEDC', '2 VERS 5.5.1', '0 @I1@ INDI', '1 NAME Anna /Muster/', '1 OCCU Magd', '2 DATE 1910', '1 OCCU Bäuerin', '0 TRLR'].join(
      '\n',
    );
    const [anna] = parseGedcom(ged, undefined, 'de').persons;
    expect(anna.occupation).toBe('Bäuerin');
    expect(anna.events.map((e) => [e.title, e.category, e.date])).toEqual([['Magd', 'OCCUPATION', '1910']]);
  });

  it('writes a valid 7.0 header with documented extension tags', () => {
    const ged = toGedcom(data, '7.0');
    expect(ged).toMatch(/^0 HEAD\r\n1 GEDC\r\n2 VERS 7\.0\r\n1 SCHMA\r\n2 TAG _HOBBY /);
    expect(ged).not.toContain('CONC');
    expect(ged.trimEnd().endsWith('0 TRLR')).toBe(true);
  });

  it('marks parents without partnership so they are not imported as partners', () => {
    const d = transfer([person('a'), person('b'), person('c')], [relation('r1', 'a', 'c', 'CHILD'), relation('r2', 'b', 'c', 'CHILD')]);
    const back = parseGedcom(toGedcom(d));
    expect(back.relations.map((r) => r.type).sort()).toEqual(['CHILD', 'CHILD']);
  });

  it('stores the languages of a person as codes, whichever way the file names them', () => {
    const ged = [
      '0 HEAD',
      '1 CHAR UTF-8',
      '0 @I1@ INDI',
      '1 NAME Anna /Weber/',
      '1 _LANGUAGE German',
      '1 _LANGUAGE de-AT',
      '1 _LANGUAGE Español',
      '1 _LANGUAGE en',
      '1 _LANGUAGE Esperanto',
      '0 TRLR',
    ].join('\n');
    // German twice (name and tag) is one entry; an unknown language stays as it is
    expect(parseGedcom(ged).persons[0].languages).toEqual(['de', 'es', 'en', 'Esperanto']);
  });

  it('marks a missing given name as unknown and does not export the placeholder', () => {
    const imported = parseGedcom(['0 HEAD', '1 CHAR UTF-8', '0 @I1@ INDI', '1 NAME /Brakenhof/', '0 TRLR'].join('\n'));
    expect(imported.persons[0]).toMatchObject({ firstName: '(Vorname unbekannt)', lastName: 'Brakenhof' });

    // The placeholder does not end up as a first name in the file either
    const ged = toGedcom(transfer([person('a', { firstName: '(Vorname unbekannt)', lastName: 'Wardenskij' }), imported.persons[0]]));
    expect(ged).toContain('1 NAME /Wardenskij/');
    expect(ged).toContain('1 NAME /Brakenhof/');
    expect(ged).not.toMatch(/GIVN|\?|unbekannt/);
  });
});
