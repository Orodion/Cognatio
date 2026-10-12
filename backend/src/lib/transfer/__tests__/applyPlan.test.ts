import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-apply-'));
jest.mock('../../files/uploads.js', () => {
  const actual = jest.requireActual('../../files/uploads.js');
  return { ...actual, uploadDir: tmpDir, removeUploadedFile: (name: string) => fs.rmSync(path.join(tmpDir, name), { force: true }) };
});

import { applyPlan } from '../applyPlan.js';
import type { ImportPlan } from '../plan.js';
import type { TransferEvent, TransferMedia } from '../format.js';
import { prismaMock } from '../../../test/prismaMock.js';
import { person, T1, T2 } from '../../../test/transferFixtures.js';

afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
beforeEach(() => {
  for (const f of fs.readdirSync(tmpDir)) {
    fs.rmSync(path.join(tmpDir, f), { force: true });
  }
  // Run the transaction callback against the mock itself
  prismaMock.$transaction.mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)) as never);
});

const emptyPlan = (overrides: Partial<ImportPlan> = {}): ImportPlan => ({
  strategy: 'MERGE_NEWER',
  replaceAll: false,
  createPersons: [],
  updatePersons: [],
  createEvents: [],
  updateEvents: [],
  createNotes: [],
  updateNotes: [],
  createMedia: [],
  updateMedia: [],
  createRelations: [],
  updateRelations: [],
  ...overrides,
});

const media = (id: string, overrides: Partial<TransferMedia> = {}): TransferMedia => ({
  id,
  path: `media/${id}.png`,
  originalFileName: `${id}.png`,
  mimeType: 'image/png',
  sizeBytes: 3,
  type: 'IMAGE',
  createdAt: T1,
  updatedAt: T1,
  ...overrides,
});

const event = (id: string, mediaIds: string[] = []): TransferEvent =>
  ({ id, title: id, category: 'OTHER', mediaIds, createdAt: T1, updatedAt: T1 }) as TransferEvent;

const uploaded = () => fs.readdirSync(tmpDir);

const mockEmptyLookups = () => prismaMock.media.findMany.mockResolvedValue([]);

describe('applyPlan', () => {
  it('creates persons, relations, events and notes in an existing tree and reports the counts', async () => {
    mockEmptyLookups();
    const plan = emptyPlan({
      createPersons: [person('a'), person('b')],
      createRelations: [{ id: 'r1', personAId: 'a', personBId: 'b', type: 'WIFE', active: true, createdAt: T1, updatedAt: T1 }],
      createEvents: [{ personId: 'a', record: event('e1') }],
      createNotes: [{ personId: 'a', record: { id: 'n1', text: 'Hi', createdAt: T1, updatedAt: T1 } }],
    });

    const result = await applyPlan(prismaMock as never, plan, new Map(), { treeId: 't1' });

    expect(result).toMatchObject({
      familyTreeId: 't1',
      createdPersons: 2,
      updatedPersons: 0,
      removedPersons: 0,
      createdRelations: 1,
      createdEvents: 1,
      createdNotes: 1,
      createdMedia: 0,
      missingFiles: [],
    });
    const created = prismaMock.person.createMany.mock.calls[0]![0]!.data as Array<{ id: string; familyTreeId: string; profilePictureId: null }>;
    expect(created.map((p) => [p.id, p.familyTreeId, p.profilePictureId])).toEqual([
      ['a', 't1', null],
      ['b', 't1', null],
    ]);
    expect(prismaMock.relation.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.familyTree.create).not.toHaveBeenCalled();
    expect(prismaMock.person.deleteMany).not.toHaveBeenCalled();
  });

  it('creates a new family tree inside the transaction', async () => {
    mockEmptyLookups();
    prismaMock.familyTree.create.mockResolvedValue({ id: 'new-tree' } as never);

    const result = await applyPlan(prismaMock as never, emptyPlan({ createPersons: [person('a')] }), new Map(), { newTreeName: 'Neu' });

    expect(prismaMock.familyTree.create).toHaveBeenCalledWith({ data: { name: 'Neu' }, select: { id: true } });
    expect(result.familyTreeId).toBe('new-tree');
    expect((prismaMock.person.createMany.mock.calls[0]![0]!.data as Array<{ familyTreeId: string }>)[0].familyTreeId).toBe('new-tree');
  });

  it('replaces only the target tree when overwriting and removes the old media files afterwards', async () => {
    fs.writeFileSync(path.join(tmpDir, 'old.png'), 'x');
    prismaMock.media.findMany.mockImplementation((async (args: { where: { familyTreeId?: string } }) =>
      args.where.familyTreeId ? [{ fileName: 'old.png' }] : []) as never);
    prismaMock.person.deleteMany.mockResolvedValue({ count: 4 });

    const result = await applyPlan(prismaMock as never, emptyPlan({ strategy: 'OVERWRITE', replaceAll: true }), new Map(), { treeId: 't1' });

    expect(result.removedPersons).toBe(4);
    expect(prismaMock.person.deleteMany).toHaveBeenCalledWith({ where: { familyTreeId: 't1' } });
    expect(prismaMock.relation.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ personA: { familyTreeId: 't1' } }, { personB: { familyTreeId: 't1' } }] } });
    expect(uploaded()).toEqual([]);
  });

  it('updates existing persons and keeps their timestamps', async () => {
    mockEmptyLookups();
    const plan = emptyPlan({ updatePersons: [person('a', { firstName: 'Neu', updatedAt: T2 })] });

    const result = await applyPlan(prismaMock as never, plan, new Map(), { treeId: 't1' });

    expect(result.updatedPersons).toBe(1);
    expect(prismaMock.person.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a' }, data: expect.objectContaining({ firstName: 'Neu', updatedAt: new Date(T2) }) }),
    );
    // Person without picture: the profile picture is reset to null
    expect(prismaMock.person.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { profilePictureId: null, updatedAt: new Date(T2) } });
  });

  it('stores media files under a random name, links them and sets the profile picture', async () => {
    prismaMock.media.findMany.mockImplementation((async (args: { where: { id?: { in: string[] } } }) =>
      (args.where.id?.in ?? []).map((id) => ({ id }))) as never);
    const plan = emptyPlan({
      createPersons: [person('a', { profilePictureId: 'm1' })],
      createMedia: [{ personId: 'a', record: media('m1') }],
      createEvents: [{ personId: 'a', record: event('e1', ['m1']) }],
    });

    const result = await applyPlan(prismaMock as never, plan, new Map([['media/m1.png', new Uint8Array([1, 2, 3, 4, 5])]]), { treeId: 't1' });

    expect(result.createdMedia).toBe(1);
    const [file] = uploaded();
    expect(file).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(fs.readFileSync(path.join(tmpDir, file))).toEqual(Buffer.from([1, 2, 3, 4, 5]));
    // The size is that of the stored file, not the one the import file claims (3)
    expect((prismaMock.media.createMany.mock.calls[0]![0]!.data as Array<{ id: string; fileName: string }>)[0]).toMatchObject({
      id: 'm1',
      fileName: file,
      sizeBytes: 5,
    });
    expect(prismaMock.eventMedia.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [{ eventId: 'e1', mediaId: 'm1' }] }));
    expect(prismaMock.person.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { profilePictureId: 'm1', updatedAt: new Date(T1) } });
  });

  it('skips media whose file is missing in the ZIP and does not link them', async () => {
    mockEmptyLookups();
    const plan = emptyPlan({
      createPersons: [person('a', { profilePictureId: 'm1' })],
      createMedia: [{ personId: 'a', record: media('m1') }],
      createEvents: [{ personId: 'a', record: event('e1', ['m1']) }],
    });

    const result = await applyPlan(prismaMock as never, plan, new Map(), { treeId: 't1' });

    expect(result).toMatchObject({ createdMedia: 0, missingFiles: ['media/m1.png'] });
    expect(uploaded()).toEqual([]);
    expect(prismaMock.eventMedia.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    expect(prismaMock.person.update).not.toHaveBeenCalled();
  });

  it('replaces the file of an updated medium and removes the old one', async () => {
    fs.writeFileSync(path.join(tmpDir, 'old.png'), 'x');
    mockEmptyLookups();
    prismaMock.media.findUnique.mockResolvedValue({ fileName: 'old.png' } as never);
    const plan = emptyPlan({ updateMedia: [{ personId: 'a', record: media('m1') }] });

    await applyPlan(prismaMock as never, plan, new Map([['media/m1.png', new Uint8Array([9])]]), { treeId: 't1' });

    expect(prismaMock.media.update).toHaveBeenCalledTimes(1);
    const files = uploaded();
    expect(files).toHaveLength(1);
    expect(files).not.toContain('old.png');
  });

  it('removes freshly written files and rethrows if the transaction fails', async () => {
    prismaMock.$transaction.mockRejectedValue(new Error('db down'));
    const plan = emptyPlan({ createPersons: [person('a')], createMedia: [{ personId: 'a', record: media('m1') }] });

    await expect(applyPlan(prismaMock as never, plan, new Map([['media/m1.png', new Uint8Array([1])]]), { treeId: 't1' })).rejects.toThrow('db down');

    expect(uploaded()).toEqual([]);
  });

  it('drops event-media links that are no longer part of an updated event', async () => {
    mockEmptyLookups();
    await applyPlan(prismaMock as never, emptyPlan({ updateEvents: [{ personId: 'a', record: event('e1', ['m2']) }] }), new Map(), { treeId: 't1' });

    expect(prismaMock.eventMedia.deleteMany).toHaveBeenCalledWith({ where: { eventId: 'e1', mediaId: { notIn: ['m2'] } } });
    expect(prismaMock.eventMedia.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });
});
