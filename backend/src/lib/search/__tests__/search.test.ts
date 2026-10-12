import type { Person, PrismaClient } from '../../../generated/prisma/client.js';
import { prismaMock } from '../../../test/prismaMock.js';
import { personPhonetics } from '../phonetics.js';
import { birthYear, collatorFor, findSimilarPersons, searchPersons, searchTerms, termCode } from '../search.js';

const db = prismaMock as unknown as PrismaClient;

const person = (id: string, data: Partial<Person>): Person =>
  ({
    id,
    firstName: '',
    lastName: null,
    middleName: null,
    birthName: null,
    nickname: null,
    title: null,
    birthDate: null,
    birthPlace: null,
    deathDate: null,
    deathPlace: null,
    occupation: null,
    hobbies: null,
    nationality: null,
    address: null,
    email: null,
    phone: null,
    familyTreeId: 'tree-1',
    isDeleted: false,
    ...data,
    phonetics: personPhonetics({ firstName: data.firstName, lastName: data.lastName, birthName: data.birthName }),
  }) as Person;

/** Hits as Prisma returns them, with the (filtered) events and notes */
const hit = (p: Person, events: Array<{ title: string; description?: string | null; place?: string | null }> = [], notes: string[] = []) => ({
  ...p,
  events: events.map((e) => ({ description: null, place: null, ...e })),
  notes: notes.map((text) => ({ text })),
});

describe('helpers', () => {
  it('splits the query into distinct lower-case terms', () => {
    expect(searchTerms('  Hans  Meier hans ')).toEqual(['hans', 'meier']);
    expect(searchTerms('')).toEqual([]);
  });

  it('uses phonetics only for words of at least three letters', () => {
    expect(termCode('meier')).toBe('67');
    expect(termCode('li')).toBe('');
    expect(termCode('1950')).toBe('');
  });

  it('reads the birth year from different date formats', () => {
    expect(birthYear('01.05.1950')).toBe(1950);
    expect(birthYear('um 1950')).toBe(1950);
    expect(birthYear('1950-05-01')).toBe(1950);
    expect(birthYear('05.1950')).toBe(1950);
    expect(birthYear('unbekannt')).toBeNull();
    expect(birthYear(null)).toBeNull();
  });
});

describe('searchPersons', () => {
  it('returns nothing for an empty query without asking the database', async () => {
    expect(await searchPersons(db, 'tree-1', '   ')).toEqual([]);
    expect(prismaMock.person.findMany).not.toHaveBeenCalled();
  });

  it('requires every term somewhere in person, spelling variant, events or notes', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    await searchPersons(db, 'tree-1', 'Meier Köln');

    const { where } = prismaMock.person.findMany.mock.calls[0][0]!;
    expect(where?.isDeleted).toBe(false);
    expect(where?.familyTreeId).toBe('tree-1');
    const [meier, koeln] = where?.AND as Array<{ OR: Array<Record<string, unknown>> }>;
    expect(meier.OR).toEqual(
      expect.arrayContaining([
        { lastName: { contains: 'meier', mode: 'insensitive' } },
        { birthPlace: { contains: 'meier', mode: 'insensitive' } },
        { phonetics: { has: '67' } },
        { notes: { some: { text: { contains: 'meier', mode: 'insensitive' } } } },
        { events: { some: { OR: expect.arrayContaining([{ place: { contains: 'meier', mode: 'insensitive' } }]) } } },
      ]),
    );
    expect(koeln.OR).toContainEqual({ phonetics: { has: '456' } });
  });

  it('ranks exact names before spelling variants, other details, events and notes', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([
      hit(person('note', { firstName: 'Otto', lastName: 'Schulz' }), [], ['Nachbar von Familie Meier']),
      hit(person('event', { firstName: 'Karl', lastName: 'Braun' }), [{ title: 'Hochzeit mit Anna Meier' }]),
      hit(person('variant', { firstName: 'Anna', lastName: 'Mayer' })),
      hit(person('prefix', { firstName: 'Hans', lastName: 'Meierhof' })),
      hit(person('exact', { firstName: 'Hans', lastName: 'Meier' })),
      hit(person('detail', { firstName: 'Eva', lastName: 'Roth', occupation: 'Meierin' })),
    ] as never);

    const results = await searchPersons(db, 'tree-1', 'Meier');
    expect(results.map((r) => [r.person.id, r.matchedIn])).toEqual([
      ['exact', ['NAME']],
      ['prefix', ['NAME']],
      ['variant', ['PHONETIC']],
      ['detail', ['DETAILS']],
      ['event', ['EVENT']],
      ['note', ['NOTE']],
    ]);
    // The helper fields for ranking are not part of the result
    expect(results[0].person).not.toHaveProperty('events');
  });

  it('sums the relevance of all terms and sorts equal scores by name', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([
      hit(person('b', { firstName: 'Hans', lastName: 'Zeller', birthPlace: 'Köln' })),
      hit(person('a', { firstName: 'Hans', lastName: 'Albers', birthPlace: 'Köln' })),
      hit(person('c', { firstName: 'Hans', lastName: 'Köln' })),
    ] as never);

    const results = await searchPersons(db, 'tree-1', 'hans köln');
    expect(results.map((r) => r.person.id)).toEqual(['c', 'a', 'b']);
    expect(results[1].matchedIn).toEqual(['NAME', 'DETAILS']);
  });
});

describe('order of equally relevant hits', () => {
  const three = () => [
    hit(person('z', { firstName: 'Hans', lastName: 'Zander' })),
    hit(person('o', { firstName: 'Hans', lastName: 'Olsen' })),
    hit(person('oe', { firstName: 'Hans', lastName: 'Östlund' })),
  ];
  const order = async (language?: string | null) => {
    prismaMock.person.findMany.mockResolvedValueOnce(three() as never);
    return (await searchPersons(db, 'tree-1', 'hans', language)).map((r) => r.person.id);
  };

  it('follows the alphabet of the language of the user', async () => {
    // German sorts "Ö" like "O", Swedish puts it after "Z"
    expect(await order('de')).toEqual(['o', 'oe', 'z']);
    expect(await order('sv')).toEqual(['o', 'z', 'oe']);
  });

  it('does not depend on the server without a language or with an invalid one', async () => {
    expect(await order()).toEqual(['o', 'oe', 'z']);
    expect(await order(null)).toEqual(['o', 'oe', 'z']);
    expect(await order('not a language')).toEqual(['o', 'oe', 'z']);
  });
});

describe('collatorFor', () => {
  it('uses the language, and the root collation for a missing or invalid one', () => {
    expect(collatorFor('sv').resolvedOptions().locale).toBe('sv');
    expect(collatorFor('de-AT').resolvedOptions().locale).toBe('de-AT');
    expect(collatorFor(undefined).resolvedOptions().locale).toBe(collatorFor('und').resolvedOptions().locale);
    expect(collatorFor('  ').resolvedOptions().locale).toBe(collatorFor('und').resolvedOptions().locale);
    expect(() => collatorFor('???')).not.toThrow();
  });
});

describe('findSimilarPersons', () => {
  it('needs a family name – a first name alone matches too many people', async () => {
    expect(await findSimilarPersons(db, 'tree-1', { firstName: 'Hans' })).toEqual([]);
    expect(prismaMock.person.findMany).not.toHaveBeenCalled();
  });

  it('finds persons with phonetically equal first and family name and a close birth year', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([
      person('same', { firstName: 'Hans', lastName: 'Meier', birthDate: '1950' }),
      person('variant', { firstName: 'Hanns', lastName: 'Mayer', birthDate: '01.05.1951' }),
      person('noYear', { firstName: 'Hans', lastName: 'Maier' }),
      person('otherYear', { firstName: 'Hans', lastName: 'Meier', birthDate: '1890' }),
      person('swapped', { firstName: 'Meier', lastName: 'Hans' }),
      person('birthName', { firstName: 'Hans', lastName: 'Schulz', birthName: 'Meier', birthDate: '1950' }),
    ] as never);

    const similar = await findSimilarPersons(db, 'tree-1', { firstName: 'Hans', lastName: 'Meier', birthDate: '12.03.1950', excludeId: 'self' });

    expect(prismaMock.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          familyTreeId: 'tree-1',
          isDeleted: false,
          id: { not: 'self' },
          AND: [{ phonetics: { hasSome: ['068'] } }, { phonetics: { hasSome: ['67'] } }],
        },
      }),
    );
    // Same year and same spelling first
    expect(similar.map((p) => p.id)).toEqual(['same', 'birthName', 'variant', 'noYear']);
  });
});
