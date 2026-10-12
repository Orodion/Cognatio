import { personResolvers } from '../personResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import type { Person } from '../../generated/prisma/index.js';

beforeEach(() => {
  // The person is in the active family tree
  prismaMock.person.findFirst.mockResolvedValue({ id: '1', isDeleted: false } as Person);
  // Interactive transactions run on the same mock; the family tree can be locked
  prismaMock.$transaction.mockImplementation(((work: (tx: typeof prismaMock) => unknown) => work(prismaMock)) as never);
  prismaMock.familyTree.updateMany.mockResolvedValue({ count: 1 });
});

describe('personResolvers - values', () => {
  it('refuses a gender or date precision the app does not know', async () => {
    const reason = (promise: Promise<unknown>) =>
      promise.then(
        () => 'no error',
        (err) => err.extensions.reason,
      );
    expect(await reason(personResolvers.Mutation.createPerson(null, { data: { firstName: 'Anna', gender: 'DIVERSE' } }, testContext))).toBe('INVALID_GENDER');
    expect(await reason(personResolvers.Mutation.createPerson(null, { data: { firstName: 'Anna', birthDatePrecision: 'ABOUT' } }, testContext))).toBe(
      'INVALID_DATE_PRECISION',
    );
    expect(await reason(personResolvers.Mutation.updatePerson(null, { id: '1', data: { firstName: 'Anna', deathDatePrecision: 'x' } }, testContext))).toBe(
      'INVALID_DATE_PRECISION',
    );
    expect(prismaMock.person.create).not.toHaveBeenCalled();
    expect(prismaMock.person.update).not.toHaveBeenCalled();
  });

  it('takes the known values and no value', async () => {
    prismaMock.person.create.mockResolvedValue({ id: '1' } as Person);
    await personResolvers.Mutation.createPerson(null, { data: { firstName: 'Anna', gender: 'FEMALE', birthDatePrecision: 'APPROXIMATE' } }, testContext);
    await personResolvers.Mutation.createPerson(null, { data: { firstName: 'Bob', birthDatePrecision: '' } }, testContext);
    expect(prismaMock.person.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.person.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ gender: 'UNKNOWN' }) });
  });
});

describe('personResolvers - Complex Scenario', () => {
  it('should create multiple persons, update one, and query them correctly', async () => {
    // 1. Create two persons with the correct Prisma type
    const mockPerson1 = { id: '1', firstName: 'Anna', lastName: 'Müller', isDeleted: false, createdAt: new Date(), updatedAt: new Date() } as Person;
    const mockPerson2 = { id: '2', firstName: 'Bob', lastName: 'Schmidt', isDeleted: false, createdAt: new Date(), updatedAt: new Date() } as Person;

    prismaMock.person.create.mockResolvedValueOnce(mockPerson1).mockResolvedValueOnce(mockPerson2);

    const created1 = await personResolvers.Mutation.createPerson(null, { data: { firstName: 'Anna', lastName: 'Müller' } }, testContext);
    const created2 = await personResolvers.Mutation.createPerson(null, { data: { firstName: 'Bob', lastName: 'Schmidt' } }, testContext);

    expect(created1.firstName).toBe('Anna');
    expect(created2.firstName).toBe('Bob');
    expect(prismaMock.person.create).toHaveBeenCalledTimes(2);
    // Phonetics of the names for the phonetic search
    expect(prismaMock.person.create).toHaveBeenCalledWith({ data: expect.objectContaining({ phonetics: ['06', '657'] }) });
    // New persons belong to the active family tree
    expect(prismaMock.person.create).toHaveBeenCalledWith({ data: expect.objectContaining({ familyTreeId: TEST_TREE_ID }) });

    // 2. Edit a person (Bob -> Robert)
    const updatedMockPerson2 = { ...mockPerson2, firstName: 'Robert' };
    prismaMock.person.findFirst.mockResolvedValueOnce(mockPerson2);
    prismaMock.person.update.mockResolvedValueOnce(updatedMockPerson2);

    const updated2 = await personResolvers.Mutation.updatePerson(null, { id: '2', data: { firstName: 'Robert' } }, testContext);

    expect(updated2.firstName).toBe('Robert');
    expect(prismaMock.person.update).toHaveBeenCalledWith({
      where: { id: '2' },
      // The last name was not passed and stays – it still counts for the phonetics
      data: { firstName: 'Robert', phonetics: ['7172', '862'] },
    });

    // 3. Query all persons
    prismaMock.person.findMany.mockResolvedValueOnce([mockPerson1, updatedMockPerson2]);

    const result = await personResolvers.Query.getPersons(null, { includeDeleted: false }, testContext);

    expect(result).toHaveLength(2);
    expect(result[0].firstName).toBe('Anna');
    expect(result[1].firstName).toBe('Robert');

    // 4. Delete and restore
    prismaMock.person.update.mockResolvedValueOnce({ ...updatedMockPerson2, isDeleted: true });
    await personResolvers.Mutation.deletePerson(null, { id: '2' }, testContext);
    expect(prismaMock.person.update).toHaveBeenCalledWith({
      where: { id: '2' },
      data: expect.objectContaining({ isDeleted: true }),
    });

    prismaMock.person.update.mockResolvedValueOnce({ ...updatedMockPerson2, isDeleted: false });
    await personResolvers.Mutation.restorePerson(null, { id: '2' }, testContext);
    expect(prismaMock.person.update).toHaveBeenCalledWith({
      where: { id: '2' },
      data: expect.objectContaining({ isDeleted: false }),
    });

    // 5. Hard delete (only from the recycle bin)
    prismaMock.person.findFirst.mockResolvedValueOnce({ isDeleted: true } as Person);
    prismaMock.media.findMany.mockResolvedValueOnce([]);
    prismaMock.person.delete.mockResolvedValueOnce(updatedMockPerson2);
    await personResolvers.Mutation.hardDeletePerson(null, { id: '2' }, testContext);
    expect(prismaMock.person.delete).toHaveBeenCalledWith({
      where: { id: '2' },
    });

    // 6. Einzelperson abfragen
    prismaMock.person.findFirst.mockResolvedValueOnce(mockPerson1);
    const getSingle = await personResolvers.Query.getPerson(null, { id: '1' }, testContext);
    expect(getSingle?.firstName).toBe('Anna');
    expect(prismaMock.person.findFirst).toHaveBeenLastCalledWith({ where: { id: '1', familyTreeId: TEST_TREE_ID } });

    // 7. Suchen
    prismaMock.person.findMany.mockResolvedValueOnce([{ ...mockPerson1, phonetics: ['06', '657'], events: [], notes: [] }] as never);
    const searchResults = await personResolvers.Query.search(null, { query: 'Anna' }, testContext);
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].person.firstName).toBe('Anna');
  });
});
describe('personResolvers - Papierkorb & Profilbild', () => {
  const ctx = testContext;

  it('lists deleted persons, most recently deleted first', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    await personResolvers.Query.getDeletedPersons(null, {}, ctx);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith({
      where: { familyTreeId: TEST_TREE_ID, isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  });

  it('lists only persons of the active family tree', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    await personResolvers.Query.getPersons(null, { includeDeleted: true }, ctx);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith({ where: { familyTreeId: TEST_TREE_ID }, orderBy: { createdAt: 'desc' } });
  });

  it('refuses to change persons of another family tree', async () => {
    prismaMock.person.findFirst.mockResolvedValue(null);
    for (const change of [
      () => personResolvers.Mutation.updatePerson(null, { id: 'x', data: { firstName: 'X' } }, ctx),
      () => personResolvers.Mutation.deletePerson(null, { id: 'x' }, ctx),
      () => personResolvers.Mutation.restorePerson(null, { id: 'x' }, ctx),
      () => personResolvers.Mutation.hardDeletePerson(null, { id: 'x' }, ctx),
      () => personResolvers.Mutation.setProfilePicture(null, { personId: 'x', mediaId: null }, ctx),
    ]) {
      await expect(change()).rejects.toMatchObject({ extensions: { reason: 'PERSON_NOT_FOUND' } });
    }
    expect(prismaMock.person.update).not.toHaveBeenCalled();
    expect(prismaMock.person.delete).not.toHaveBeenCalled();
  });

  it('finds the family tree of a person for links from other trees', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ familyTreeId: 'tree-2' } as Person);
    await expect(personResolvers.Query.locatePerson(null, { id: 'p1' }, ctx)).resolves.toBe('tree-2');
    expect(prismaMock.person.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'p1', familyTree: { isDeleted: false } },
      select: { familyTreeId: true },
    });
    prismaMock.person.findFirst.mockResolvedValueOnce(null);
    await expect(personResolvers.Query.locatePerson(null, { id: 'weg' }, ctx)).resolves.toBeNull();
  });

  it('refuses to hard delete a person that is not in the trash', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ isDeleted: false } as Person);
    await expect(personResolvers.Mutation.hardDeletePerson(null, { id: '1' }, ctx)).rejects.toThrow(/recycle bin/);
    expect(prismaMock.person.delete).not.toHaveBeenCalled();
  });

  it('removes relations, media, events and notes together with the person', async () => {
    prismaMock.person.findFirst.mockResolvedValueOnce({ isDeleted: true, familyTreeId: TEST_TREE_ID } as Person);
    prismaMock.media.findMany.mockResolvedValueOnce([]);
    await personResolvers.Mutation.hardDeletePerson(null, { id: '1' }, ctx);
    // The family tree is locked before the list of files is read: an upload at the same time is in it
    expect(prismaMock.familyTree.updateMany).toHaveBeenCalledWith({ where: { id: TEST_TREE_ID, isDeleted: false }, data: { isDeleted: false } });
    expect(prismaMock.familyTree.updateMany.mock.invocationCallOrder[0]).toBeLessThan(prismaMock.media.findMany.mock.invocationCallOrder[0]);
    expect(prismaMock.media.findMany).toHaveBeenCalledWith({ where: { personId: '1' }, select: { fileName: true } });
    expect(prismaMock.media.deleteMany).toHaveBeenCalledWith({ where: { personId: '1' } });
    expect(prismaMock.person.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(prismaMock.relation.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ personAId: '1' }, { personBId: '1' }] },
    });
    expect(prismaMock.event.deleteMany).toHaveBeenCalledWith({ where: { personId: '1' } });
    expect(prismaMock.note.deleteMany).toHaveBeenCalledWith({ where: { personId: '1' } });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('only accepts images of the same person as profile picture', async () => {
    prismaMock.media.findUnique.mockResolvedValueOnce({ id: 'm1', personId: '2', mimeType: 'image/png' } as never);
    await expect(personResolvers.Mutation.setProfilePicture(null, { personId: '1', mediaId: 'm1' }, ctx)).rejects.toThrow(/profile picture/);

    prismaMock.media.findUnique.mockResolvedValueOnce({ id: 'm2', personId: '1', mimeType: 'application/pdf' } as never);
    await expect(personResolvers.Mutation.setProfilePicture(null, { personId: '1', mediaId: 'm2' }, ctx)).rejects.toThrow(/profile picture/);
    expect(prismaMock.person.update).not.toHaveBeenCalled();
  });

  it('sets and removes the profile picture', async () => {
    prismaMock.media.findUnique.mockResolvedValueOnce({ id: 'm1', personId: '1', mimeType: 'image/jpeg' } as never);
    await personResolvers.Mutation.setProfilePicture(null, { personId: '1', mediaId: 'm1' }, ctx);
    expect(prismaMock.person.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { profilePictureId: 'm1' } });

    await personResolvers.Mutation.setProfilePicture(null, { personId: '1', mediaId: null }, ctx);
    expect(prismaMock.person.update).toHaveBeenLastCalledWith({ where: { id: '1' }, data: { profilePictureId: null } });
  });

  it('resolves the profile picture URL', async () => {
    expect(await personResolvers.Person.profilePictureUrl({ profilePictureId: null }, null, ctx)).toBeNull();
    prismaMock.media.findMany.mockResolvedValueOnce([{ id: 'm1', fileName: 'abc.jpg' }] as never);
    expect(await personResolvers.Person.profilePictureUrl({ profilePictureId: 'm1' }, null, ctx)).toBe('/uploads/abc.jpg');
  });

  it('loads the profile pictures of a list with a single query', async () => {
    prismaMock.media.findMany.mockResolvedValueOnce([
      { id: 'm1', fileName: 'a.jpg' },
      { id: 'm2', fileName: 'b.png' },
    ] as never);
    // Like GraphQL for a list: all fields are requested in the same turn
    const urls = await Promise.all(['m1', 'm2', 'fehlt'].map((id) => personResolvers.Person.profilePictureUrl({ profilePictureId: id }, null, ctx)));
    expect(urls).toEqual(['/uploads/a.jpg', '/uploads/b.png', null]);
    expect(prismaMock.media.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.media.findMany.mock.calls[0][0]).toMatchObject({ where: { id: { in: ['m1', 'm2', 'fehlt'] } } });
  });
});
