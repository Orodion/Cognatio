import { prismaMock } from '../../../test/prismaMock.js';
import { person, relation, T1, transfer } from '../../../test/transferFixtures.js';
import { foreignIds, remapIds } from '../foreignIds.js';

const media = (id: string) => ({
  id,
  path: `media/${id}.jpg`,
  originalFileName: `${id}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 1,
  type: 'PHOTO',
  createdAt: T1,
  updatedAt: T1,
});
const event = (id: string, mediaIds: string[] = []) => ({
  id,
  title: 'Hochzeit',
  category: 'WEDDING',
  mediaIds,
  citationIds: [],
  createdAt: T1,
  updatedAt: T1,
});
const note = (id: string) => ({ id, text: 'Notiz', createdAt: T1, updatedAt: T1 });

// Anna and Otto, married; the wedding photo belongs to Anna and is also linked to Otto's event
const family = () =>
  transfer(
    [
      person('anna', { profilePictureId: 'photo', media: [media('photo')], events: [event('e-anna', ['photo'])], notes: [note('n1')] }),
      person('otto', { events: [event('e-otto', ['photo'])] }),
    ],
    [relation('r1', 'anna', 'otto', 'HUSBAND')],
  );

describe('remapIds', () => {
  it('assigns new IDs and updates every reference', () => {
    let n = 0;
    const data = remapIds(family(), new Set(['anna', 'photo', 'e-otto', 'n1', 'r1']), () => `neu${++n}`);
    const [anna, otto] = data.persons;
    const [annaId, photoId, eOttoId, noteId, relationId] = ['anna', 'photo', 'e-otto', 'n1', 'r1'].map((_, i) => `neu${i + 1}`);

    expect(anna.id).toBe(annaId);
    expect(anna.profilePictureId).toBe(photoId);
    expect(anna.media[0].id).toBe(photoId);
    expect(anna.events[0]).toMatchObject({ id: 'e-anna', mediaIds: [photoId] });
    expect(anna.notes[0].id).toBe(noteId);
    expect(otto).toMatchObject({ id: 'otto', events: [{ id: eOttoId, mediaIds: [photoId] }] });
    expect(data.relations[0]).toMatchObject({ id: relationId, personAId: annaId, personBId: 'otto' });
    // Paths of the files inside the ZIP file stay – they refer to the content, not to the id
    expect(anna.media[0].path).toBe('media/photo.jpg');
  });

  it('leaves the file unchanged without taken IDs', () => {
    const data = family();
    expect(remapIds(data, new Set())).toBe(data);
  });
});

describe('foreignIds', () => {
  it('reports IDs taken outside the target family tree, but not the ones of the tree itself', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([{ id: 'otto' }] as never);
    prismaMock.relation.findMany.mockResolvedValueOnce([]);
    prismaMock.event.findMany.mockResolvedValueOnce([{ id: 'e-otto' }] as never);
    prismaMock.note.findMany.mockResolvedValueOnce([]);
    prismaMock.media.findMany.mockResolvedValueOnce([]);

    // Anna with her event is already in the target family tree
    const existing = transfer([person('anna', { events: [event('e-anna')] })]);
    const taken = await foreignIds(prismaMock, family(), existing);

    expect([...taken].sort()).toEqual(['e-otto', 'otto']);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith({ where: { id: { in: ['otto'] } }, select: { id: true } });
    expect(prismaMock.event.findMany).toHaveBeenCalledWith({ where: { id: { in: ['e-otto'] } }, select: { id: true } });
  });

  it('asks in portions for large files', async () => {
    const persons = Array.from({ length: 10_001 }, (_, i) => person(`p${i}`));
    prismaMock.person.findMany.mockResolvedValue([]);
    await foreignIds(prismaMock, transfer(persons), transfer([]));
    expect(prismaMock.person.findMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.relation.findMany).not.toHaveBeenCalled();
  });
});
