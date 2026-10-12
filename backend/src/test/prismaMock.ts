import { mockDeep, mockReset } from 'jest-mock-extended';
import type { PrismaClient } from '../generated/prisma/client.js';

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});

/** Family tree the resolver tests work in */
export const TEST_TREE_ID = 'tree-1';

/** Resolver context of the tests: mocked database, active family tree TEST_TREE_ID */
export const testContext = {
  prisma: prismaMock as unknown as PrismaClient,
  treeId: async () => TEST_TREE_ID,
};
