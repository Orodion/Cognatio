import { MAX_NOTE_LENGTH, noteResolvers } from '../noteResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import type { Note, Person } from '../../generated/prisma/index.js';

const ctx = testContext;

const mockNote = {
  id: 'n1',
  personId: '1',
  text: 'Das ist eine Testnotiz.',
  createdAt: new Date(),
  updatedAt: new Date(),
} as Note;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('noteResolvers - Query', () => {
  it('should fetch all notes for a person, newest first', async () => {
    prismaMock.note.findMany.mockResolvedValueOnce([mockNote]);

    const result = await noteResolvers.Query.getNotes(null, { personId: '1' }, ctx);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Das ist eine Testnotiz.');
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: { personId: '1', person: { familyTreeId: TEST_TREE_ID } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return empty array if person has no notes', async () => {
    prismaMock.note.findMany.mockResolvedValueOnce([]);

    const result = await noteResolvers.Query.getNotes(null, { personId: '999' }, ctx);

    expect(result).toHaveLength(0);
  });
});

describe('noteResolvers - Mutation', () => {
  describe('createNote', () => {
    it('should create a valid note', async () => {
      prismaMock.person.findFirst.mockResolvedValueOnce({ id: '1' } as Person);
      prismaMock.note.create.mockResolvedValueOnce(mockNote);

      const created = await noteResolvers.Mutation.createNote(null, { data: { personId: '1', text: 'Das ist eine Testnotiz.' } }, ctx);

      expect(created.text).toBe('Das ist eine Testnotiz.');
      expect(prismaMock.note.create).toHaveBeenCalledWith({
        data: {
          personId: '1',
          text: 'Das ist eine Testnotiz.',
        },
      });
      // Only persons of the active family tree
      expect(prismaMock.person.findFirst).toHaveBeenCalledWith({ where: { id: '1', familyTreeId: TEST_TREE_ID } });
    });

    it('should reject an empty text', async () => {
      await expect(noteResolvers.Mutation.createNote(null, { data: { personId: '1', text: '   ' } }, ctx)).rejects.toThrow(/must not be empty/);
    });

    it('accepts a note of the maximum length and refuses a longer one before touching the database', async () => {
      prismaMock.person.findFirst.mockResolvedValueOnce({ id: '1' } as Person);
      prismaMock.note.create.mockResolvedValueOnce(mockNote);
      await noteResolvers.Mutation.createNote(null, { data: { personId: '1', text: `  ${'a'.repeat(MAX_NOTE_LENGTH)}  ` } }, ctx);
      expect(prismaMock.note.create).toHaveBeenCalledWith({ data: { personId: '1', text: 'a'.repeat(MAX_NOTE_LENGTH) } });

      jest.clearAllMocks();
      await expect(noteResolvers.Mutation.createNote(null, { data: { personId: '1', text: 'a'.repeat(MAX_NOTE_LENGTH + 1) } }, ctx)).rejects.toMatchObject({
        extensions: { reason: 'NOTE_TOO_LONG' },
      });
      expect(prismaMock.note.create).not.toHaveBeenCalled();
    });

    it('should reject if person does not exist', async () => {
      prismaMock.person.findFirst.mockResolvedValueOnce(null);

      await expect(noteResolvers.Mutation.createNote(null, { data: { personId: '999', text: 'Test' } }, ctx)).rejects.toThrow(/does not exist/);
    });
  });

  describe('updateNote', () => {
    it('should update note text', async () => {
      const updated = { ...mockNote, text: 'Aktualisierter Text' };
      prismaMock.note.findFirst.mockResolvedValueOnce(mockNote);
      prismaMock.note.update.mockResolvedValueOnce(updated);

      const result = await noteResolvers.Mutation.updateNote(null, { id: 'n1', data: { text: 'Aktualisierter Text' } }, ctx);

      expect(result.text).toBe('Aktualisierter Text');
      expect(prismaMock.note.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { text: 'Aktualisierter Text' },
      });
    });

    it('rejects notes of another family tree', async () => {
      prismaMock.note.findFirst.mockResolvedValueOnce(null);
      await expect(noteResolvers.Mutation.updateNote(null, { id: 'n1', data: { text: 'Neu' } }, ctx)).rejects.toThrow(/does not exist/);
      expect(prismaMock.note.findFirst).toHaveBeenCalledWith({ where: { id: 'n1', person: { familyTreeId: TEST_TREE_ID } }, select: { id: true } });
      expect(prismaMock.note.update).not.toHaveBeenCalled();
    });

    it('should reject empty text on update', async () => {
      await expect(noteResolvers.Mutation.updateNote(null, { id: 'n1', data: { text: '' } }, ctx)).rejects.toThrow(/must not be empty/);
    });

    it('refuses a text above the limit on update', async () => {
      await expect(noteResolvers.Mutation.updateNote(null, { id: 'n1', data: { text: 'b'.repeat(MAX_NOTE_LENGTH + 1) } }, ctx)).rejects.toMatchObject({
        extensions: { reason: 'NOTE_TOO_LONG' },
      });
      expect(prismaMock.note.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      prismaMock.note.findFirst.mockResolvedValueOnce(mockNote);
      prismaMock.note.delete.mockResolvedValueOnce(mockNote);

      const result = await noteResolvers.Mutation.deleteNote(null, { id: 'n1' }, ctx);

      expect(result).toBe(true);
      expect(prismaMock.note.delete).toHaveBeenCalledWith({ where: { id: 'n1' } });
    });
  });
});

describe('noteResolvers - Note', () => {
  it('returns the times as ISO timestamps', () => {
    const at = new Date('2026-10-11T08:30:00.000Z');
    expect(noteResolvers.Note.createdAt({ createdAt: at })).toBe('2026-10-11T08:30:00.000Z');
    expect(noteResolvers.Note.updatedAt({ updatedAt: at })).toBe('2026-10-11T08:30:00.000Z');
  });
});
