import type { PrismaClient } from '../../generated/prisma/client.js';
import { uploadUrl } from './uploads.js';

type MediaReader = Pick<PrismaClient, 'media'>;

/** Found media by id: URL and the person they belong to */
type Found = Map<string, { url: string; personId: string | null }>;

interface Batch {
  ids: Set<string>;
  result: Promise<Found>;
}

// Pending batch query per Prisma instance; executed after the current turn of the event loop
const pending = new WeakMap<MediaReader, Batch>();

/**
 * URL of the profile picture of a person – only a medium of that person counts. GraphQL resolves
 * `profilePictureUrl` separately for every person of a list – the calls of one turn are collected here and answered
 * with a single query (instead of one query per person).
 */
export function loadProfilePictureUrl(db: MediaReader, mediaId: string, personId: string): Promise<string | null> {
  let batch = pending.get(db);
  if (!batch) {
    const ids = new Set<string>();
    const result = new Promise<Found>((resolve, reject) => {
      setImmediate(() => {
        pending.delete(db);
        db.media
          .findMany({ where: { id: { in: [...ids] } }, select: { id: true, fileName: true, personId: true } })
          .then((rows) => resolve(new Map(rows.map((m) => [m.id, { url: uploadUrl(m.fileName), personId: m.personId }]))), reject);
      });
    });
    batch = { ids, result };
    pending.set(db, batch);
  }
  batch.ids.add(mediaId);
  return batch.result.then((media) => {
    const found = media.get(mediaId);
    return found?.personId === personId ? found.url : null;
  });
}
