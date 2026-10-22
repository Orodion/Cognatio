import type { PrismaClient } from '../generated/prisma/client.js';

type Db = Pick<PrismaClient, 'media'>;

/**
 * Scans of sources and citations belong to the library (no family tree, no person). Once nothing links one any more –
 * its source or citation was deleted for good –, it is removed. Returns the stored file names; the caller removes the
 * files after its transaction succeeded.
 */
export async function removeOrphanedLibraryMedia(db: Db, candidateIds: string[]): Promise<string[]> {
  if (!candidateIds.length) {
    return [];
  }
  const where = {
    id: { in: [...new Set(candidateIds)] },
    familyTreeId: null,
    personId: null,
    sources: { none: {} },
    citations: { none: {} },
    events: { none: {} },
  };
  const orphans = await db.media.findMany({ where, select: { id: true, fileName: true } });
  if (!orphans.length) {
    return [];
  }
  await db.media.deleteMany({ where: { id: { in: orphans.map((m) => m.id) } } });
  return orphans.map((m) => m.fileName);
}

/** Media a source or citation may link: scans of the library and files of the active family tree */
export const linkableMedia = (treeId: string) => ({ OR: [{ familyTreeId: treeId }, { familyTreeId: null, personId: null }] });
