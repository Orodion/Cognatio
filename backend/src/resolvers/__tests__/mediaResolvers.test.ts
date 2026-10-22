import { GraphQLError } from 'graphql';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import fs from 'fs';
import { mediaResolvers } from '../mediaResolvers.js';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  unlinkSync: jest.fn(),
  existsSync: jest.fn(),
}));
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockImplementation((...args) => args.join('/')),
}));
const ctx = testContext;

beforeEach(() => {
  jest.clearAllMocks();
});

const mockMedia = {
  id: 'm1',
  familyTreeId: TEST_TREE_ID,
  personId: '1',
  fileName: 'test.jpg',
  originalFileName: 'test_orig.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: BigInt(1024),
  type: 'PROFILE_PICTURE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('mediaResolvers', () => {
  describe('Query.getPersonMedia', () => {
    it('should return media for a given person', async () => {
      prismaMock.media.findMany.mockResolvedValueOnce([mockMedia]);

      const result = await mediaResolvers.Query.getPersonMedia(null, { personId: '1' }, ctx);

      expect(result).toHaveLength(1);
      expect(prismaMock.media.findMany).toHaveBeenCalledWith({
        where: { personId: '1', familyTreeId: TEST_TREE_ID },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('Query.getLinkedMedia', () => {
    it('returns media of other persons linked to events of the person', async () => {
      prismaMock.media.findMany.mockResolvedValueOnce([mockMedia]);

      await mediaResolvers.Query.getLinkedMedia(null, { personId: '2' }, ctx);

      expect(prismaMock.media.findMany).toHaveBeenCalledWith({
        where: { familyTreeId: TEST_TREE_ID, events: { some: { event: { personId: '2' } } }, NOT: { personId: '2' } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('Media fields', () => {
    it('resolves the owner and the linked events', async () => {
      prismaMock.person.findUnique.mockResolvedValueOnce({ id: '1', firstName: 'Anna' } as never);
      prismaMock.eventMedia.findMany.mockResolvedValueOnce([{ event: { id: 'e1', title: 'Hochzeit' } }] as never);

      await expect(mediaResolvers.Media.person({ personId: '1' }, {}, ctx)).resolves.toMatchObject({ firstName: 'Anna' });
      expect(mediaResolvers.Media.person({ personId: null }, {}, ctx)).toBeNull();
      await expect(mediaResolvers.Media.events({ id: 'm1' }, {}, ctx)).resolves.toEqual([{ id: 'e1', title: 'Hochzeit' }]);
      // Shown by the browser or offered as a download
      expect(mediaResolvers.Media.viewable({ fileName: 'scan.PDF' })).toBe(true);
      expect(mediaResolvers.Media.viewable({ fileName: 'notiz.md' })).toBe(true);
      expect(mediaResolvers.Media.viewable({ fileName: 'seite.html' })).toBe(false);
      expect(mediaResolvers.Media.viewable({ fileName: 'daten.zip' })).toBe(false);
    });
  });

  describe('Mutation.deleteMedia', () => {
    it('should delete a media entry and its physical file', async () => {
      prismaMock.media.findFirst.mockResolvedValueOnce(mockMedia);
      prismaMock.media.delete.mockResolvedValueOnce(mockMedia);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await mediaResolvers.Mutation.deleteMedia(null, { id: 'm1' }, ctx);

      expect(result).toBe(true);
      expect(prismaMock.media.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
      // The reference as profile picture is removed
      expect(prismaMock.person.updateMany).toHaveBeenCalledWith({
        where: { profilePictureId: 'm1' },
        data: { profilePictureId: null },
      });
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should throw an error if media is not found', async () => {
      prismaMock.media.findFirst.mockResolvedValueOnce(null);

      await expect(mediaResolvers.Mutation.deleteMedia(null, { id: 'm999' }, ctx)).rejects.toThrow(GraphQLError);
      expect(prismaMock.media.delete).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});
