import { prismaMock } from '../../test/prismaMock.js';
import { lazyTree, requestedTree, resolveTree } from '../treeScope.js';

describe('resolveTree', () => {
  it('uses the requested family tree if it exists and is not in the trash', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce({ id: 't2' } as never);
    await expect(resolveTree(prismaMock, 't2')).resolves.toBe('t2');
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 't2', isDeleted: false } }));
  });

  it('rejects an unknown or deleted family tree instead of falling back', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce(null);
    await expect(resolveTree(prismaMock, 'weg')).rejects.toMatchObject({ extensions: { reason: 'TREE_NOT_FOUND' } });
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledTimes(1);
  });

  it('uses the oldest family tree without request', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce({ id: 'oldest' } as never);
    await expect(resolveTree(prismaMock)).resolves.toBe('oldest');
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledWith({ where: { isDeleted: false }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  });

  it('creates no family tree when there is none: the app shows its page without family tree', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValue(null);
    await expect(resolveTree(prismaMock, null)).rejects.toMatchObject({ extensions: { reason: 'TREE_NOT_FOUND' } });
    expect(prismaMock.familyTree.create).not.toHaveBeenCalled();
  });

  it('looks the family tree up only once per request', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValue({ id: 't1' } as never);
    const treeId = lazyTree(prismaMock, 't1');
    expect(prismaMock.familyTree.findFirst).not.toHaveBeenCalled();
    await Promise.all([treeId(), treeId(), treeId()]);
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe('requestedTree', () => {
  const req = (header?: string, familyTree?: unknown) => ({ get: () => header, query: { familyTree } });

  it('reads the header, for downloads also the query parameter', () => {
    expect(requestedTree(req('t1', 't2'))).toBe('t1');
    expect(requestedTree(req(undefined, ' t2 '))).toBe('t2');
    expect(requestedTree(req(undefined, ['t1', 't2']))).toBeNull();
    expect(requestedTree(req('  '))).toBeNull();
  });
});
