import type { PrismaClient } from '../../generated/prisma/client.js';
import { uploadUrl } from './uploads.js';

type MediaReader = Pick<PrismaClient, 'media'>;

interface Batch {
  ids: Set<string>;
  result: Promise<Map<string, string>>;
}

// Pending batch query per Prisma instance; executed after the current turn of the event loop
const pending = new WeakMap<MediaReader, Batch>();

/**
 * URL of the profile picture. GraphQL resolves `profilePictureUrl` separately for every person of a list –
 * the calls of one turn are collected here and answered with a single query
 * (instead of one query per person).
 */
export function loadProfilePictureUrl(db: MediaReader, mediaId: string): Promise<string | null> {
  let batch = pending.get(db);
  if (!batch) {
    const ids = new Set<string>();
    const result = new Promise<Map<string, string>>((resolve, reject) => {
      setImmediate(() => {
        pending.delete(db);
        db.media
          .findMany({ where: { id: { in: [...ids] } }, select: { id: true, fileName: true } })
          .then((rows) => resolve(new Map(rows.map((m) => [m.id, uploadUrl(m.fileName)]))), reject);
      });
    });
    batch = { ids, result };
    pending.set(db, batch);
  }
  batch.ids.add(mediaId);
  return batch.result.then((urls) => urls.get(mediaId) ?? null);
}
