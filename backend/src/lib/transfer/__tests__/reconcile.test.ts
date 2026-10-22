import { reconcileGedcom } from '../reconcile.js';
import { analyze } from '../plan.js';
import { person, relation, transfer, T1, T2 } from '../../../test/transferFixtures.js';

describe('reconcileGedcom', () => {
  it('recognises persons by ID and keeps what GEDCOM does not know', () => {
    const existing = transfer([person('p1', { firstName: 'Anna', hobbies: 'Garten', languages: ['de'], gender: 'FEMALE', profilePictureId: 'm1' })]);
    const imported = transfer([person('p1', { firstName: 'Anna', occupation: 'Lehrerin', updatedAt: T2 })]);

    const { data, recognized } = reconcileGedcom(imported, existing);
    expect(recognized).toEqual({ byId: 1, byName: 0 });
    expect(data.persons[0]).toMatchObject({ id: 'p1', hobbies: 'Garten', languages: ['de'], gender: 'FEMALE', profilePictureId: 'm1', occupation: 'Lehrerin' });
  });

  it('recognises persons without ID by first name, family name and birth year – only if unique', () => {
    const existing = transfer([
      person('hans', { firstName: 'Hans Peter', lastName: 'Meier', birthDate: '01.05.1950' }),
      person('erika', { firstName: 'Erika', lastName: 'Schulz', birthName: 'Weber', birthDate: '1955' }),
      person('zwilling1', { firstName: 'Max', lastName: 'Roth', birthDate: '1960' }),
      person('zwilling2', { firstName: 'Max', lastName: 'Roth', birthDate: '1960' }),
      person('ohneJahr', { firstName: 'Otto', lastName: 'Klein' }),
      person('anderesDatum', { firstName: 'Karl', lastName: 'Wolf', birthDate: '03.03.1930' }),
    ]);
    const imported = transfer(
      [
        person('g1', { firstName: 'Hans', lastName: 'MEIER', birthDate: 'um 1950' }),
        person('g2', { firstName: 'Erika', lastName: null, birthName: 'Weber', birthDate: '12.12.1955' }),
        person('g3', { firstName: 'Max', lastName: 'Roth', birthDate: '1960' }),
        person('g4', { firstName: 'Otto', lastName: 'Klein' }),
        person('g5', { firstName: 'Karl', lastName: 'Wolf', birthDate: '04.04.1930' }),
      ],
      [relation('r1', 'g1', 'g2', 'WIFE'), relation('r2', 'g1', 'g4', 'CHILD')],
    );

    const { data, recognized } = reconcileGedcom(imported, existing);
    expect(recognized).toEqual({ byId: 0, byName: 2 });
    expect(data.persons.map((p) => p.id)).toEqual(['hans', 'erika', 'g3', 'g4', 'g5']);
    // Relations point to the recognised persons
    expect(data.relations.map((r) => [r.personAId, r.personBId])).toEqual([
      ['hans', 'erika'],
      ['hans', 'g4'],
    ]);
  });

  it('does not recognise persons by name whose given name is unknown', () => {
    const existing = transfer([person('alt', { firstName: '(Vorname unbekannt)', lastName: 'Brakenhof', birthDate: '1900' })]);
    const imported = transfer([person('g1', { firstName: '(Vorname unbekannt)', lastName: 'Brakenhof', birthDate: '1900' })]);
    const { data, recognized } = reconcileGedcom(imported, existing);
    expect(recognized).toEqual({ byId: 0, byName: 0 });
    expect(data.persons.map((p) => p.id)).toEqual(['g1']);
  });

  it('does not match two persons of the file to the same existing person', () => {
    const existing = transfer([person('a', { firstName: 'Lena', lastName: 'Berg', birthDate: '1990' })]);
    const imported = transfer([
      person('a', { firstName: 'Lena', lastName: 'Berg', birthDate: '1990' }),
      person('x', { firstName: 'Lena', lastName: 'Berg', birthDate: '1990' }),
    ]);
    const { data, recognized } = reconcileGedcom(imported, existing);
    expect(recognized).toEqual({ byId: 1, byName: 0 });
    expect(data.persons.map((p) => p.id)).toEqual(['a', 'x']);
  });

  it('recognises events and dates the import wrote in another language', () => {
    const event = (id: string, title: string, date: string) => ({
      id,
      title,
      category: 'OTHER',
      date,
      mediaIds: [],
      citationIds: [],
      createdAt: T1,
      updatedAt: T1,
    });
    const existing = transfer([person('p', { firstName: 'Anna', birthDate: 'um 1850', events: [event('e-old', 'Beerdigung', 'vor 1920')] })]);
    const imported = transfer([
      person('neu', { firstName: 'Anna', birthDate: 'about 1850', events: [event('e-neu', 'Burial', 'before 1920')], updatedAt: T2 }),
    ]);

    const { data } = reconcileGedcom(imported, existing);
    expect(data.persons[0]).toMatchObject({ id: 'p', birthDate: 'um 1850' });
    expect(data.persons[0].events).toEqual([expect.objectContaining({ id: 'e-old', title: 'Beerdigung', date: 'vor 1920' })]);
  });

  it('compares dates in the words of every language of the interface', () => {
    const existing = transfer([person('p', { firstName: 'Anna', birthDate: 'vers 1850', deathDate: 'przed 1920' })]);
    const imported = transfer([person('neu', { firstName: 'Anna', birthDate: 'about 1850', deathDate: 'before 1920', updatedAt: T2 })]);

    expect(reconcileGedcom(imported, existing).data.persons[0]).toMatchObject({ id: 'p', birthDate: 'vers 1850', deathDate: 'przed 1920' });
  });

  it('reuses events, notes and media with the same content so a re-import adds nothing twice', () => {
    const event = { id: 'e-old', title: 'Taufe', category: 'BAPTISM', mediaIds: ['m-old'], citationIds: [], date: '1950', createdAt: T1, updatedAt: T1 };
    const existing = transfer([
      person('p', {
        firstName: 'Anna',
        birthDate: '1950',
        events: [event],
        notes: [{ id: 'n-old', text: 'Notiz', createdAt: T1, updatedAt: T1 }],
        media: [
          {
            id: 'm-old',
            path: 'x',
            originalFileName: 'a.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 3,
            type: 'PHOTO',
            createdAt: T1,
            updatedAt: T1,
          },
        ],
      }),
    ]);
    const imported = transfer([
      person('neu', {
        firstName: 'Anna',
        birthDate: '1950',
        profilePictureId: 'm-neu',
        events: [
          { ...event, id: 'e-neu', mediaIds: ['m-neu'], citationIds: [], createdAt: T2, updatedAt: T2 },
          { id: 'e-extra', title: 'Umzug', category: 'MOVE', mediaIds: [], citationIds: [], createdAt: T2, updatedAt: T2 },
        ],
        notes: [{ id: 'n-neu', text: ' Notiz ', createdAt: T2, updatedAt: T2 }],
        media: [
          {
            id: 'm-neu',
            path: 'media/a.jpg',
            originalFileName: 'a.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 3,
            type: 'PROFILE_PICTURE',
            createdAt: T2,
            updatedAt: T2,
          },
        ],
      }),
      // Group photo of Anna at another person's event
      person('gast', {
        firstName: 'Gast',
        events: [{ id: 'e-gast', title: 'Hochzeit', category: 'WEDDING', mediaIds: ['m-neu'], citationIds: [], createdAt: T2, updatedAt: T2 }],
      }),
    ]);

    const { data } = reconcileGedcom(imported, existing);
    const [anna, gast] = data.persons;
    expect(anna.events.map((e) => [e.id, e.updatedAt])).toEqual([
      ['e-old', T1],
      ['e-extra', T2],
    ]);
    expect(anna.notes[0].id).toBe('n-old');
    expect(anna.media[0].id).toBe('m-old');
    expect(anna.events[0].mediaIds).toEqual(['m-old']);
    expect(gast.events[0].mediaIds).toEqual(['m-old']);
    expect(anna.profilePictureId).toBe('m-old');

    // Compared with the existing data only the new event remains (and the changed media type)
    const analysis = analyze(data, existing);
    expect(analysis.newPersons).toEqual(['gast']);
    expect(analysis.events.created.map((c) => c.record.id)).toEqual(['e-extra']);
    expect(analysis.notes.created).toEqual([]);
    expect(analysis.media.created).toEqual([]);
  });
});
