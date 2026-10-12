import fs from 'fs';
import { prismaMock, testContext } from '../../test/prismaMock.js';
import { familyTreeResolvers } from '../familyTreeResolvers.js';

jest.mock('fs');

const ctx = testContext;
const at = new Date('2026-09-30T08:00:00.000Z');
const tree = (data: Record<string, unknown> = {}) => ({
  id: 't1',
  name: 'Familie Müller',
  description: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: at,
  updatedAt: at,
  _count: { persons: 3 },
  ...data,
});

describe('familyTreeResolvers - Query', () => {
  it('lists the family trees with their number of persons and ISO timestamps', async () => {
    prismaMock.familyTree.findMany.mockResolvedValueOnce([tree()] as never);

    const [result] = await familyTreeResolvers.Query.familyTrees(null, {}, ctx);

    expect(result).toEqual({
      id: 't1',
      name: 'Familie Müller',
      description: null,
      isDeleted: false,
      personCount: 3,
      deletedAt: null,
      createdAt: '2026-09-30T08:00:00.000Z',
      updatedAt: '2026-09-30T08:00:00.000Z',
    });
    // Persons in the recycle bin do not count
    expect(prismaMock.familyTree.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDeleted: false },
        include: { _count: { select: { persons: { where: { isDeleted: false } } } } },
      }),
    );
  });

  it('creates no family tree in an empty database: the list stays empty', async () => {
    prismaMock.familyTree.findMany.mockResolvedValueOnce([]);
    await expect(familyTreeResolvers.Query.familyTrees(null, {}, ctx)).resolves.toEqual([]);
    expect(prismaMock.familyTree.create).not.toHaveBeenCalled();
  });

  it('returns the active family tree of the request', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValueOnce(tree({ id: 'tree-1' }) as never);
    await expect(familyTreeResolvers.Query.activeFamilyTree(null, {}, ctx)).resolves.toMatchObject({ id: 'tree-1' });
    expect(prismaMock.familyTree.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tree-1' } }));
  });

  it('lists deleted family trees, most recently deleted first', async () => {
    prismaMock.familyTree.findMany.mockResolvedValueOnce([tree({ isDeleted: true, deletedAt: at })] as never);
    const [result] = await familyTreeResolvers.Query.deletedFamilyTrees(null, {}, ctx);
    expect(result.deletedAt).toBe('2026-09-30T08:00:00.000Z');
    expect(prismaMock.familyTree.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isDeleted: true }, orderBy: { deletedAt: 'desc' } }));
  });
});

describe('familyTreeResolvers - Mutation', () => {
  it('creates a family tree with trimmed name and description', async () => {
    prismaMock.familyTree.create.mockResolvedValueOnce(tree() as never);
    await familyTreeResolvers.Mutation.createFamilyTree(null, { data: { name: '  Familie Müller ', description: '  ' } }, ctx);
    expect(prismaMock.familyTree.create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Familie Müller', description: null } }));
  });

  it('requires a name of at most 100 characters', async () => {
    await expect(familyTreeResolvers.Mutation.createFamilyTree(null, { data: { name: '   ' } }, ctx)).rejects.toMatchObject({
      extensions: { reason: 'TREE_NAME_REQUIRED' },
    });
    await expect(familyTreeResolvers.Mutation.createFamilyTree(null, { data: { name: 'x'.repeat(101) } }, ctx)).rejects.toMatchObject({
      extensions: { reason: 'TREE_NAME_TOO_LONG' },
    });
    expect(prismaMock.familyTree.create).not.toHaveBeenCalled();
  });

  it('renames only existing family trees', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce(null);
    await expect(familyTreeResolvers.Mutation.updateFamilyTree(null, { id: 'weg', data: { name: 'Neu' } }, ctx)).rejects.toMatchObject({
      extensions: { reason: 'TREE_NOT_FOUND' },
    });

    prismaMock.familyTree.findFirst.mockResolvedValueOnce(tree() as never);
    prismaMock.familyTree.update.mockResolvedValueOnce(tree({ name: 'Neu' }) as never);
    await expect(familyTreeResolvers.Mutation.updateFamilyTree(null, { id: 't1', data: { name: 'Neu' } }, ctx)).resolves.toMatchObject({ name: 'Neu' });
  });

  it('moves a family tree to the trash, also the last one', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValue(tree() as never);
    await expect(familyTreeResolvers.Mutation.deleteFamilyTree(null, { id: 't1' }, ctx)).resolves.toBe(true);
    expect(prismaMock.familyTree.count).not.toHaveBeenCalled();
    expect(prismaMock.familyTree.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { isDeleted: true, deletedAt: expect.any(Date) } });
  });

  it('restores a family tree from the trash', async () => {
    prismaMock.familyTree.findFirst.mockResolvedValueOnce(tree({ isDeleted: true }) as never);
    prismaMock.familyTree.update.mockResolvedValueOnce(tree() as never);
    await familyTreeResolvers.Mutation.restoreFamilyTree(null, { id: 't1' }, ctx);
    expect(prismaMock.familyTree.findFirst).toHaveBeenCalledWith({ where: { id: 't1', isDeleted: true } });
    expect(prismaMock.familyTree.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isDeleted: false, deletedAt: null } }));
  });

  it('deletes permanently only from the trash', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValueOnce({ isDeleted: false } as never);
    await expect(familyTreeResolvers.Mutation.hardDeleteFamilyTree(null, { id: 't1' }, ctx)).rejects.toMatchObject({
      extensions: { reason: 'TREE_NOT_DELETED' },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deletes all data of the family tree and its files', async () => {
    prismaMock.familyTree.findUnique.mockResolvedValueOnce({ isDeleted: true } as never);
    prismaMock.$transaction.mockImplementation(((work: (tx: typeof prismaMock) => unknown) => work(prismaMock)) as never);
    prismaMock.familyTree.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.media.findMany.mockResolvedValueOnce([{ fileName: 'a.jpg' }] as never);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    await expect(familyTreeResolvers.Mutation.hardDeleteFamilyTree(null, { id: 't1' }, ctx)).resolves.toBe(true);

    // The family tree is locked first, the list of files is read after it – an upload at the same time is in it
    expect(prismaMock.familyTree.updateMany).toHaveBeenCalledWith({ where: { id: 't1', isDeleted: true }, data: { isDeleted: true } });
    expect(prismaMock.familyTree.updateMany.mock.invocationCallOrder[0]).toBeLessThan(prismaMock.media.findMany.mock.invocationCallOrder[0]);

    expect(prismaMock.relation.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ personA: { familyTreeId: 't1' } }, { personB: { familyTreeId: 't1' } }] },
    });
    expect(prismaMock.media.deleteMany).toHaveBeenCalledWith({ where: { familyTreeId: 't1' } });
    expect(prismaMock.event.deleteMany).toHaveBeenCalledWith({ where: { person: { familyTreeId: 't1' } } });
    expect(prismaMock.note.deleteMany).toHaveBeenCalledWith({ where: { person: { familyTreeId: 't1' } } });
    expect(prismaMock.person.deleteMany).toHaveBeenCalledWith({ where: { familyTreeId: 't1' } });
    expect(prismaMock.importRecord.deleteMany).toHaveBeenCalledWith({ where: { familyTreeId: 't1' } });
    expect(prismaMock.familyTree.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('a.jpg'));
  });

  it('deletes nothing if the family tree is gone meanwhile', async () => {
    (fs.unlinkSync as jest.Mock).mockClear();
    prismaMock.familyTree.findUnique.mockResolvedValueOnce({ isDeleted: true } as never);
    prismaMock.$transaction.mockImplementation(((work: (tx: typeof prismaMock) => unknown) => work(prismaMock)) as never);
    prismaMock.familyTree.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(familyTreeResolvers.Mutation.hardDeleteFamilyTree(null, { id: 't1' }, ctx)).rejects.toMatchObject({
      extensions: { reason: 'TREE_NOT_FOUND' },
    });
    expect(prismaMock.media.deleteMany).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
