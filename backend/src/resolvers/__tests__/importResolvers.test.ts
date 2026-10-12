import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import { importResolvers } from '../importResolvers.js';

const ctx = testContext;

describe('importResolvers', () => {
  it('lists the latest imports first and limits the number', async () => {
    prismaMock.importRecord.findMany.mockResolvedValue([]);
    await importResolvers.Query.importHistory(null, { limit: 5 }, ctx);
    expect(prismaMock.importRecord.findMany).toHaveBeenLastCalledWith({ where: { familyTreeId: TEST_TREE_ID }, orderBy: { importedAt: 'desc' }, take: 5 });

    await importResolvers.Query.importHistory(null, { limit: 10_000 }, ctx);
    expect(prismaMock.importRecord.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 100 }));
    await importResolvers.Query.importHistory(null, {}, ctx);
    expect(prismaMock.importRecord.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 20 }));
  });

  it('returns times as ISO timestamps', () => {
    const at = new Date('2026-09-29T12:00:00.000Z');
    expect(importResolvers.ImportRecord.importedAt({ importedAt: at })).toBe('2026-09-29T12:00:00.000Z');
    expect(importResolvers.ImportRecord.exportedAt({ exportedAt: null })).toBeNull();
  });
});
