import type { GraphQLContext } from '../lib/treeScope.js';

const MAX_LIMIT = 100;

export const importResolvers = {
  Query: {
    // Import history of the active family tree, newest first
    importHistory: async (_: unknown, { limit }: { limit?: number | null }, { prisma, treeId }: GraphQLContext) =>
      prisma.importRecord.findMany({
        where: { familyTreeId: await treeId() },
        orderBy: { importedAt: 'desc' },
        take: Math.min(Math.max(limit ?? 20, 1), MAX_LIMIT),
      }),
  },
  // Times as ISO timestamps (Date would otherwise be returned as a number of milliseconds)
  ImportRecord: {
    importedAt: (record: { importedAt: Date }) => record.importedAt.toISOString(),
    exportedAt: (record: { exportedAt: Date | null }) => record.exportedAt?.toISOString() ?? null,
  },
};
