import { statisticsResolvers } from '../statisticsResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import type { Person } from '../../generated/prisma/index.js';

const anna = { id: 'anna', firstName: 'Anna', lastName: 'Kraft', gender: 'FEMALE', birthDate: '1950', isDeleted: false } as Person;
const paul = { id: 'paul', firstName: 'Paul', lastName: 'Kraft', gender: 'MALE', birthDate: '1920', isDeleted: false } as Person;
const otto = { id: 'otto', firstName: 'Otto', lastName: 'Lang', gender: 'MALE', isDeleted: false } as Person;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.person.findMany.mockResolvedValue([anna, paul, otto]);
  prismaMock.relation.findMany.mockResolvedValue([{ personAId: 'anna', personBId: 'paul', type: 'FATHER' }] as never);
  prismaMock.familyTree.findUnique.mockResolvedValue({ homePersonId: null } as never);
});

describe('statisticsResolvers', () => {
  it('computes the figures of the active family tree without the recycle bin', async () => {
    const stats = await statisticsResolvers.Query.treeStatistics(null, {}, testContext);

    expect(prismaMock.person.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyTreeId: TEST_TREE_ID, isDeleted: false } }));
    expect(stats).toMatchObject({ total: 3, male: 2, relations: 1, families: 1, unconnected: 1, oldestBirth: { year: 1920, person: paul } });
  });

  it('computes the figures of a scope', async () => {
    const stats = await statisticsResolvers.Query.treeStatistics(null, { scope: { kind: 'ANCESTORS', personId: 'anna' } }, testContext);
    expect(stats).toMatchObject({ total: 2, unconnected: 0 });
  });

  it('lists the persons behind a figure, also within a scope', async () => {
    expect(await statisticsResolvers.Query.statisticsPersons(null, { filter: 'surname:kraft' }, testContext)).toEqual([anna, paul]);
    expect(
      await statisticsResolvers.Query.statisticsPersons(null, { filter: 'gender:MALE', scope: { kind: 'SURNAME', surname: 'Kraft' } }, testContext),
    ).toEqual([paul]);
  });

  it('counts the ancestors from the home person, from a person asked for or from the person with the most ancestors', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ homePersonId: 'paul' } as never);
    expect((await statisticsResolvers.Query.treeStatistics(null, {}, testContext)).ancestors).toMatchObject({
      person: paul,
      isHomePerson: true,
      hasHomePerson: true,
      generations: [expect.objectContaining({ generation: 1, found: 1 })],
    });
    expect((await statisticsResolvers.Query.treeStatistics(null, { ancestorsOf: 'anna' }, testContext)).ancestors).toMatchObject({
      person: anna,
      isHomePerson: false,
      generations: [expect.objectContaining({ generation: 1 }), expect.objectContaining({ generation: 2, found: 1 })],
    });
    prismaMock.familyTree.findUnique.mockResolvedValue({ homePersonId: 'gone' } as never);
    expect((await statisticsResolvers.Query.treeStatistics(null, {}, testContext)).ancestors).toMatchObject({ person: anna, hasHomePerson: false });
    await expect(statisticsResolvers.Query.treeStatistics(null, { ancestorsOf: 'stranger' }, testContext)).rejects.toMatchObject({
      extensions: { reason: 'PERSON_NOT_FOUND' },
    });
  });

  it('lists the ancestors of a generation and the persons without a fact', async () => {
    expect(await statisticsResolvers.Query.statisticsPersons(null, { filter: 'ancestors:anna:2' }, testContext)).toEqual([paul]);
    expect(await statisticsResolvers.Query.statisticsPersons(null, { filter: 'missing:birthDate' }, testContext)).toEqual([otto]);
  });

  it('refuses an unknown filter or scope as bad input', async () => {
    await expect(statisticsResolvers.Query.statisticsPersons(null, { filter: 'nonsense' }, testContext)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', reason: 'BAD_FILTER' },
    });
    await expect(statisticsResolvers.Query.treeStatistics(null, { scope: { kind: 'DESCENDANTS', personId: 'stranger' } }, testContext)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', reason: 'PERSON_NOT_FOUND' },
    });
  });
});
