import { plausibilityResolvers } from '../plausibilityResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import type { FamilyTree, Person } from '../../generated/prisma/index.js';

const anna = { id: 'anna', firstName: 'Anna', lastName: 'Kraft', gender: 'FEMALE', isDeleted: false } as Person;
const paul = { id: 'paul', firstName: 'Paul', lastName: 'Kraft', gender: 'MALE', isDeleted: false } as Person;
const MOTHER_KEY = 'ROLE_GENDER|r1|anna,paul';

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.person.findMany.mockResolvedValue([anna, paul]);
  prismaMock.relation.findMany.mockResolvedValue([{ id: 'r1', personAId: 'anna', personBId: 'paul', type: 'MOTHER', startDate: null }] as never);
  prismaMock.event.findMany.mockResolvedValue([]);
});

describe('plausibilityResolvers', () => {
  it('lists the possible errors of the family tree with their persons and whether they are checked', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ checkedIssues: [MOTHER_KEY] } as FamilyTree);

    const issues = await plausibilityResolvers.Query.plausibilityIssues(null, null, testContext);

    expect(issues).toEqual([
      expect.objectContaining({ key: MOTHER_KEY, code: 'ROLE_GENDER', persons: [paul, anna], relationId: 'r1', role: 'MOTHER', checked: true }),
    ]);
  });

  it('counts the issues not marked as right', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ checkedIssues: [] } as unknown as FamilyTree);
    expect(await plausibilityResolvers.Query.openPlausibilityIssues(null, null, testContext)).toBe(1);
    prismaMock.familyTree.findUnique.mockResolvedValue({ checkedIssues: [MOTHER_KEY] } as FamilyTree);
    expect(await plausibilityResolvers.Query.openPlausibilityIssues(null, null, testContext)).toBe(0);
  });

  it('marks an issue as right and drops keys of issues that are gone', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ checkedIssues: ['LIVING_TOO_OLD||gone'] } as FamilyTree);

    await plausibilityResolvers.Mutation.checkPlausibilityIssue(null, { key: MOTHER_KEY, checked: true }, testContext);

    expect(prismaMock.familyTree.update).toHaveBeenCalledWith({ where: { id: TEST_TREE_ID }, data: { checkedIssues: [MOTHER_KEY] } });
  });

  it('shows a checked issue again and refuses to check one that does not exist', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ checkedIssues: [MOTHER_KEY] } as FamilyTree);

    await plausibilityResolvers.Mutation.checkPlausibilityIssue(null, { key: MOTHER_KEY, checked: false }, testContext);
    expect(prismaMock.familyTree.update).toHaveBeenCalledWith({ where: { id: TEST_TREE_ID }, data: { checkedIssues: [] } });

    await expect(plausibilityResolvers.Mutation.checkPlausibilityIssue(null, { key: 'nonsense', checked: true }, testContext)).rejects.toMatchObject({
      extensions: { reason: 'ISSUE_NOT_FOUND' },
    });
  });
});
