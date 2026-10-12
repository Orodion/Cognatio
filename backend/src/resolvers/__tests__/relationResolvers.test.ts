import { GraphQLError } from 'graphql';
import { relationResolvers, roleOfOther, isSameRelation, birthDateOf } from '../relationResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import type { Person, Relation } from '../../generated/prisma/index.js';

const personId = (id: string) => ({ id }) as unknown as Person;

const ctx = testContext;

const mockRelation = {
  id: 'r1',
  personAId: '1',
  personBId: '2',
  type: 'PARTNER',
  label: null,
  active: true,
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Relation;

beforeEach(() => {
  jest.clearAllMocks();
  // The relation is in the active family tree
  prismaMock.relation.findFirst.mockResolvedValue({ id: 'r1' } as Relation);
});

describe('relationResolvers - Query', () => {
  it('should fetch only active relations by default', async () => {
    prismaMock.relation.findMany.mockResolvedValueOnce([mockRelation]);

    const result = await relationResolvers.Query.getRelations(null, {}, ctx);

    expect(result).toHaveLength(1);
    expect(prismaMock.relation.findMany).toHaveBeenCalledWith({
      where: { personA: { familyTreeId: TEST_TREE_ID }, active: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('should include inactive relations when requested', async () => {
    prismaMock.relation.findMany.mockResolvedValueOnce([]);

    await relationResolvers.Query.getRelations(null, { includeInactive: true }, ctx);

    expect(prismaMock.relation.findMany).toHaveBeenCalledWith({
      where: { personA: { familyTreeId: TEST_TREE_ID } },
      orderBy: { createdAt: 'asc' },
    });
  });

  describe('roleOfOther', () => {
    it('derives the role of the other person from the viewer perspective', () => {
      expect(roleOfOther('MOTHER', true, {})).toBe('MOTHER');
      expect(roleOfOther('MOTHER', false, {})).toBe('CHILD');
      expect(roleOfOther('CHILD', false, { gender: 'MALE' })).toBe('FATHER');
      expect(roleOfOther('CHILD', false, { gender: 'FEMALE' })).toBe('MOTHER');
      expect(roleOfOther('HUSBAND', false, { gender: 'FEMALE' })).toBe('WIFE');
      expect(roleOfOther('HUSBAND', false, {})).toBe('SPOUSE');
      expect(roleOfOther('SIBLING', false, {})).toBe('SIBLING');
    });
  });

  describe('isSameRelation', () => {
    it('treats parent/child relations in either direction as equal', () => {
      expect(isSameRelation({ personAId: '1', personBId: '2', type: 'MOTHER' }, { personAId: '2', personBId: '1', type: 'CHILD' })).toBe(true);
      expect(isSameRelation({ personAId: '1', personBId: '2', type: 'MOTHER' }, { personAId: '1', personBId: '2', type: 'CHILD' })).toBe(false);
      expect(isSameRelation({ personAId: '1', personBId: '2', type: 'HUSBAND' }, { personAId: '2', personBId: '1', type: 'PARTNER' })).toBe(true);
      expect(isSameRelation({ personAId: '1', personBId: '2', type: 'SIBLING' }, { personAId: '1', personBId: '2', type: 'PARTNER' })).toBe(false);
    });
  });

  describe('getPersonRelations', () => {
    it('should map roles correctly based on perspective', async () => {
      // Mock two relations: one where person is A, one where person is B
      prismaMock.relation.findMany.mockResolvedValueOnce([
        {
          ...mockRelation,
          id: 'r1',
          type: 'CHILD',
          personAId: '1',
          personBId: '2',
          personA: { id: '1', firstName: 'A' },
          personB: { id: '2', firstName: 'B' },
        } as unknown as Relation,
        {
          ...mockRelation,
          id: 'r2',
          type: 'CHILD',
          personAId: '3',
          personBId: '1',
          personA: { id: '3', firstName: 'C' },
          personB: { id: '1', firstName: 'A' },
        } as unknown as Relation,
      ]);

      // Query from perspective of person '1'
      const result = await relationResolvers.Query.getPersonRelations(null, { personId: '1' }, ctx);

      expect(result).toHaveLength(2);

      // In r1, person '1' is personA (the parent), so the role of the relation relative to '1' is CHILD (the other person is the child)
      expect(result[0].id).toBe('r1');
      expect(result[0].role).toBe('CHILD');
      expect(result[0].otherPerson.id).toBe('2');

      // In r2, person '1' is personB (the child), so the role of the relation relative to '1' is PARENT (the other person is the parent)
      expect(result[1].id).toBe('r2');
      expect(result[1].role).toBe('PARENT');
      expect(result[1].otherPerson.id).toBe('3');

      expect(prismaMock.relation.findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          personA: { familyTreeId: TEST_TREE_ID },
          OR: [{ personAId: '1' }, { personBId: '1' }],
        },
        include: { personA: true, personB: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});

describe('relationResolvers - Mutation', () => {
  describe('createRelation', () => {
    it('should create a valid relation', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.create.mockResolvedValueOnce(mockRelation);

      const created = await relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'PARTNER' } }, ctx);

      expect(created.id).toBe('r1');
      expect(prismaMock.relation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          personAId: '1',
          personBId: '2',
          type: 'PARTNER',
          active: true,
        }),
      });
    });

    it('should reject an invalid relation type', async () => {
      await expect(relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'FRIEND' } }, ctx)).rejects.toThrow(
        GraphQLError,
      );
      expect(prismaMock.relation.create).not.toHaveBeenCalled();
    });

    it('should reject a relation to the same person', async () => {
      await expect(relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '1', type: 'PARTNER' } }, ctx)).rejects.toThrow(
        /with itself/,
      );
    });

    it('should reject if a person does not exist', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1')]);

      await expect(relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '999', type: 'PARTNER' } }, ctx)).rejects.toThrow(
        /do not exist/,
      );
    });

    it('only links persons of the active family tree', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1')]);

      await expect(
        relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: 'other-tree', type: 'PARTNER' } }, ctx),
      ).rejects.toMatchObject({ extensions: { reason: 'PERSON_NOT_FOUND' } });
      expect(prismaMock.person.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', 'other-tree'] }, familyTreeId: TEST_TREE_ID },
        select: { id: true },
      });
      expect(prismaMock.relation.create).not.toHaveBeenCalled();
    });
  });

  describe('createRelation - validation and derivation', () => {
    it('should reject when end date is before start date', async () => {
      await expect(
        relationResolvers.Mutation.createRelation(
          null,
          { data: { personAId: '1', personBId: '2', type: 'WIFE', startDate: '2000-01-01', endDate: '1990-01-01' } },
          ctx,
        ),
      ).rejects.toThrow(/end date/);
    });

    it('should reject a duplicate relation', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      // Already recorded as "CHILD" from the mother's point of view -> "MOTHER" from the child's point of view is a duplicate
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, personAId: '2', personBId: '1', type: 'CHILD' }]);

      await expect(relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'MOTHER' } }, ctx)).rejects.toThrow(
        /already exists/,
      );
    });

    it('rejects a person as their own parent (two generations)', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      // '3' is the father of '2' and '1' is the mother of '3'; now '2' is to become the mother of '1'
      prismaMock.relation.findMany.mockResolvedValueOnce([
        { ...mockRelation, id: 'a', personAId: '2', personBId: '3', type: 'FATHER' },
        { ...mockRelation, id: 'b', personAId: '3', personBId: '1', type: 'MOTHER' },
      ]);

      await expect(relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'MOTHER' } }, ctx)).rejects.toMatchObject({
        extensions: { reason: 'CYCLE' },
      });
      expect(prismaMock.relation.create).not.toHaveBeenCalled();
    });

    it('rejects the opposite direction of an existing parent-child relation', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      // '2' is already a child of '1' (recorded as CHILD from the view of '1'); '2' cannot also be the father of '1'
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, id: 'a', personAId: '1', personBId: '2', type: 'CHILD' }]);

      await expect(relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'FATHER' } }, ctx)).rejects.toMatchObject({
        extensions: { reason: 'CYCLE' },
      });
    });

    it('allows a new parent who has ancestors of their own (no cycle)', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      // '2' and '7' are children of '9'; '2' becomes the father of '1' – '1' is not above '2', so there is no cycle
      prismaMock.relation.findMany.mockResolvedValueOnce([
        { ...mockRelation, id: 'a', personAId: '2', personBId: '9', type: 'FATHER' },
        { ...mockRelation, id: 'b', personAId: '7', personBId: '9', type: 'FATHER' },
      ]);
      prismaMock.relation.create.mockResolvedValueOnce({ ...mockRelation, personAId: '1', personBId: '2', type: 'FATHER' });
      prismaMock.relation.findMany.mockResolvedValueOnce([]);

      await relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'FATHER' } }, ctx);

      expect(prismaMock.relation.create).toHaveBeenCalledTimes(1);
    });

    it('should add the child to the partner of the parent and link siblings', async () => {
      // Child '1' gets mother '2'. Mother '2' is married to '3' and already has child '4'.
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]); // parent-child graph for the cycle check
      prismaMock.relation.create.mockResolvedValueOnce({
        ...mockRelation,
        personAId: '1',
        personBId: '2',
        type: 'MOTHER',
      });
      prismaMock.relation.findMany.mockResolvedValueOnce([
        { ...mockRelation, id: 'p', personAId: '2', personBId: '3', type: 'HUSBAND' },
        { ...mockRelation, id: 'k', personAId: '4', personBId: '2', type: 'MOTHER' },
      ]);

      await relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'MOTHER' } }, ctx);

      // The derived relations in one statement
      expect(prismaMock.relation.createMany).toHaveBeenCalledWith({
        data: [
          { personAId: '3', personBId: '1', type: 'CHILD', active: true },
          { personAId: '1', personBId: '4', type: 'SIBLING', active: true },
        ],
      });
      expect(prismaMock.relation.createMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.relation.create).toHaveBeenCalledTimes(1);
    });

    it('starts the derived relation to the second parent with the birth of the child', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]); // parent-child graph for the cycle check
      prismaMock.relation.create.mockResolvedValueOnce({ ...mockRelation, personAId: '1', personBId: '2', type: 'MOTHER' });
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, id: 'p', personAId: '2', personBId: '3', type: 'HUSBAND' }]);
      prismaMock.person.findUnique.mockResolvedValueOnce({ birthDate: '13.02.1985' } as Person);

      await relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'MOTHER', startDate: '1985-02-13' } }, ctx);

      expect(prismaMock.person.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.person.findUnique).toHaveBeenCalledWith({ where: { id: '1' }, select: { birthDate: true } });
      expect(prismaMock.relation.createMany).toHaveBeenCalledWith({
        data: [{ personAId: '3', personBId: '1', type: 'CHILD', startDate: new Date('1985-02-13T00:00:00.000Z'), active: true }],
      });
    });

    it('asks for the birth of the child only when a second parent is added', async () => {
      // Mother '2' has partners '3' and '6' but child '1' already has father '5': nobody else becomes a parent
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]); // parent-child graph for the cycle check
      prismaMock.relation.create.mockResolvedValueOnce({ ...mockRelation, personAId: '1', personBId: '2', type: 'MOTHER' });
      prismaMock.relation.findMany.mockResolvedValueOnce([
        { ...mockRelation, id: 'p', personAId: '2', personBId: '3', type: 'HUSBAND' },
        { ...mockRelation, id: 'q', personAId: '2', personBId: '6', type: 'PARTNER' },
        { ...mockRelation, id: 'v', personAId: '1', personBId: '5', type: 'FATHER' },
      ]);

      await relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'MOTHER' } }, ctx);

      expect(prismaMock.person.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.relation.createMany).not.toHaveBeenCalled();
    });

    it('should not add a third parent', async () => {
      // Child '1' already has father '5'; new mother '2' is married to '3' -> '3' does not become a parent
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]); // parent-child graph for the cycle check
      prismaMock.relation.create.mockResolvedValueOnce({
        ...mockRelation,
        personAId: '1',
        personBId: '2',
        type: 'MOTHER',
      });
      prismaMock.relation.findMany.mockResolvedValueOnce([
        { ...mockRelation, id: 'p', personAId: '2', personBId: '3', type: 'HUSBAND' },
        { ...mockRelation, id: 'v', personAId: '1', personBId: '5', type: 'FATHER' },
      ]);

      await relationResolvers.Mutation.createRelation(null, { data: { personAId: '1', personBId: '2', type: 'MOTHER' } }, ctx);

      expect(prismaMock.relation.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.relation.createMany).not.toHaveBeenCalled();
    });
  });

  describe('updateRelation', () => {
    it('should update label, note and active', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.update.mockResolvedValueOnce({
        ...mockRelation,
        label: 'Adoptivkind',
        note: 'Seit 1990',
        active: false,
      });

      const updated = await relationResolvers.Mutation.updateRelation(
        null,
        {
          id: 'r1',
          data: {
            personAId: '1',
            personBId: '2',
            type: 'CHILD',
            label: 'Adoptivkind',
            note: 'Seit 1990',
            active: false,
          },
        },
        ctx,
      );

      expect(updated.label).toBe('Adoptivkind');
      expect(prismaMock.relation.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({
          type: 'CHILD',
          label: 'Adoptivkind',
          note: 'Seit 1990',
          active: false,
        }),
      });
    });

    it('rejects a change that repeats another relation of the same persons, but not the relation itself', async () => {
      prismaMock.relation.findFirst.mockResolvedValue({ ...mockRelation, type: 'SIBLING' });
      prismaMock.person.findMany.mockResolvedValue([personId('1'), personId('2')]);
      prismaMock.relation.update.mockResolvedValue({ ...mockRelation, type: 'WIFE' });
      const change = { id: 'r1', data: { personAId: '1', personBId: '2', type: 'WIFE' } };

      // the relation itself is among the found ones: allowed
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, id: 'r1', type: 'SIBLING' }]);
      await relationResolvers.Mutation.updateRelation(null, change, ctx);

      // another marriage of the two already exists
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, id: 'other', type: 'HUSBAND' }]);
      await expect(relationResolvers.Mutation.updateRelation(null, change, ctx)).rejects.toMatchObject({
        extensions: { reason: 'DUPLICATE' },
      });
    });

    it('does not check a relation that is switched off', async () => {
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValue([{ ...mockRelation, id: 'other', type: 'WIFE' }]);
      prismaMock.relation.update.mockResolvedValueOnce({ ...mockRelation, type: 'WIFE', active: false });

      await relationResolvers.Mutation.updateRelation(null, { id: 'r1', data: { personAId: '1', personBId: '2', type: 'WIFE', active: false } }, ctx);

      expect(prismaMock.relation.update).toHaveBeenCalled();
    });

    it('rejects a change to a parent-child relation that makes a person their own ancestor', async () => {
      prismaMock.relation.findFirst.mockResolvedValue({ ...mockRelation, type: 'SIBLING' });
      prismaMock.person.findMany.mockResolvedValueOnce([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, id: 'a', personAId: '1', personBId: '2', type: 'CHILD' }]);

      await expect(
        relationResolvers.Mutation.updateRelation(null, { id: 'r1', data: { personAId: '1', personBId: '2', type: 'FATHER' } }, ctx),
      ).rejects.toMatchObject({ extensions: { reason: 'CYCLE' } });
      expect(prismaMock.relation.update).not.toHaveBeenCalled();
    });

    it('derives siblings when a relation becomes a parent-child relation, but not when only its note changes', async () => {
      // Before: sibling. After: '2' is the mother of '1'; '2' has another child '4'
      prismaMock.relation.findFirst.mockResolvedValue({ ...mockRelation, type: 'SIBLING' });
      prismaMock.person.findMany.mockResolvedValue([personId('1'), personId('2')]);
      prismaMock.relation.update.mockResolvedValue({ ...mockRelation, personAId: '1', personBId: '2', type: 'MOTHER' });
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      prismaMock.relation.findMany.mockResolvedValueOnce([]);
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, id: 'k', personAId: '4', personBId: '2', type: 'MOTHER' }]);

      await relationResolvers.Mutation.updateRelation(null, { id: 'r1', data: { personAId: '1', personBId: '2', type: 'MOTHER' } }, ctx);
      expect(prismaMock.relation.createMany).toHaveBeenCalledWith({
        data: [{ personAId: '1', personBId: '4', type: 'SIBLING', active: true }],
      });

      // The relation already was a parent-child relation of the same persons: nothing is derived again
      jest.clearAllMocks();
      prismaMock.relation.findFirst.mockResolvedValue({ ...mockRelation, personAId: '1', personBId: '2', type: 'MOTHER' });
      prismaMock.person.findMany.mockResolvedValue([personId('1'), personId('2')]);
      prismaMock.relation.findMany.mockResolvedValue([]);
      prismaMock.relation.update.mockResolvedValue({ ...mockRelation, personAId: '1', personBId: '2', type: 'MOTHER', note: 'x' });

      await relationResolvers.Mutation.updateRelation(null, { id: 'r1', data: { personAId: '1', personBId: '2', type: 'MOTHER', note: 'x' } }, ctx);
      expect(prismaMock.relation.create).not.toHaveBeenCalled();
      expect(prismaMock.relation.createMany).not.toHaveBeenCalled();
    });

    it('should reject an invalid type', async () => {
      await expect(
        relationResolvers.Mutation.updateRelation(
          null,
          {
            id: 'r1',
            data: { personAId: '1', personBId: '2', type: 'SPECIAL' },
          },
          ctx,
        ),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('deleteRelation / restoreRelation / hardDeleteRelation', () => {
    it('should deactivate a relation on delete', async () => {
      prismaMock.relation.update.mockResolvedValueOnce({ ...mockRelation, active: false });

      const result = await relationResolvers.Mutation.deleteRelation(null, { id: 'r1' }, ctx);

      expect(result).toBe(true);
      expect(prismaMock.relation.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { active: false },
      });
    });

    it('does not restore a relation that now repeats an active one', async () => {
      prismaMock.relation.findFirst.mockResolvedValue({ ...mockRelation, active: false, type: 'WIFE' });
      prismaMock.relation.findMany.mockResolvedValueOnce([{ ...mockRelation, id: 'other', type: 'HUSBAND' }]);

      await expect(relationResolvers.Mutation.restoreRelation(null, { id: 'r1' }, ctx)).rejects.toMatchObject({
        extensions: { reason: 'DUPLICATE' },
      });
      expect(prismaMock.relation.update).not.toHaveBeenCalled();
    });

    it('should reactivate a relation on restore', async () => {
      prismaMock.relation.update.mockResolvedValueOnce(mockRelation);

      const restored = await relationResolvers.Mutation.restoreRelation(null, { id: 'r1' }, ctx);

      expect(restored.active).toBe(true);
      expect(prismaMock.relation.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { active: true },
      });
    });

    it('rejects relations of another family tree', async () => {
      prismaMock.relation.findFirst.mockResolvedValue(null);

      await expect(relationResolvers.Mutation.hardDeleteRelation(null, { id: 'r1' }, ctx)).rejects.toMatchObject({
        extensions: { reason: 'RELATION_NOT_FOUND' },
      });
      expect(prismaMock.relation.findFirst).toHaveBeenCalledWith({ where: { id: 'r1', personA: { familyTreeId: TEST_TREE_ID } } });
      expect(prismaMock.relation.delete).not.toHaveBeenCalled();
    });

    it('should permanently delete a relation', async () => {
      prismaMock.relation.delete.mockResolvedValueOnce(mockRelation);

      const result = await relationResolvers.Mutation.hardDeleteRelation(null, { id: 'r1' }, ctx);

      expect(result).toBe(true);
      expect(prismaMock.relation.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });
  });
});

describe('birthDateOf', () => {
  it('reads only exact birth dates', () => {
    expect(birthDateOf('13.02.1985')).toEqual(new Date('1985-02-13T00:00:00.000Z'));
    expect(birthDateOf(' 01.01.1900 ')).toEqual(new Date('1900-01-01T00:00:00.000Z'));
    expect(birthDateOf('31.02.1985')).toBeNull();
    expect(birthDateOf('um 1985')).toBeNull();
    expect(birthDateOf('1985')).toBeNull();
    expect(birthDateOf(null)).toBeNull();
  });
});
