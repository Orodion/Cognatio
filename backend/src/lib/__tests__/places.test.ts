import { placeSuggestions, MAX_PLACES } from '../places.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import { personResolvers } from '../../resolvers/personResolvers.js';

const rows = <K extends string>(key: K, places: Array<[string | null, number]>) => places.map(([place, count]) => ({ [key]: place, _count: { _all: count } }));

function given(births: Array<[string | null, number]>, deaths: Array<[string | null, number]>, events: Array<[string | null, number]>) {
  (prismaMock.person.groupBy as unknown as jest.Mock).mockResolvedValueOnce(rows('birthPlace', births)).mockResolvedValueOnce(rows('deathPlace', deaths));
  (prismaMock.event.groupBy as unknown as jest.Mock).mockResolvedValueOnce(rows('place', events));
}

describe('placeSuggestions', () => {
  it('lists the places of persons and life events, most used first, then alphabetically', async () => {
    given(
      [
        ['Berlin', 2],
        ['Augsburg', 1],
      ],
      [['Cottbus', 1]],
      [
        ['Berlin', 1],
        ['Dresden', 3],
      ],
    );
    expect(await placeSuggestions(testContext.prisma, TEST_TREE_ID)).toEqual(['Berlin', 'Dresden', 'Augsburg', 'Cottbus']);
  });

  it('counts spellings that differ only in case or spaces as one place, in its most used spelling', async () => {
    given(
      [
        ['berlin', 1],
        [' Berlin ', 2],
      ],
      [['  ', 4]],
      [
        ['BERLIN', 1],
        [null, 5],
      ],
    );
    expect(await placeSuggestions(testContext.prisma, TEST_TREE_ID)).toEqual(['Berlin']);
  });

  it('reads only persons of the family tree that are not in the recycle bin', async () => {
    given([], [], []);
    await placeSuggestions(testContext.prisma, TEST_TREE_ID);
    const person = { familyTreeId: TEST_TREE_ID, isDeleted: false };
    expect(prismaMock.person.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { ...person, birthPlace: { not: null } } }));
    expect(prismaMock.event.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { person, place: { not: null } } }));
  });

  it('suggests at most MAX_PLACES places', async () => {
    given(
      Array.from({ length: MAX_PLACES + 10 }, (_, i) => [`Place ${i}`, 1] as [string, number]),
      [],
      [],
    );
    expect(await placeSuggestions(testContext.prisma, TEST_TREE_ID)).toHaveLength(MAX_PLACES);
  });

  it('answers the query places of the active family tree', async () => {
    given([['Berlin', 1]], [], []);
    expect(await personResolvers.Query.places(null, null, testContext)).toEqual(['Berlin']);
  });
});
