import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { FORMAT_NAME, FORMAT_VERSION, type TransferData } from './format.js';

type Db = Pick<PrismaClient, 'person' | 'relation' | 'event' | 'note' | 'media'>;

/** Upper limit of ids per query (PostgreSQL allows at most 32,767 parameters) */
const CHUNK = 10_000;

/** All ids of the file by record type */
function idsOf(data: TransferData) {
  return {
    person: data.persons.map((p) => p.id),
    relation: data.relations.map((r) => r.id),
    event: data.persons.flatMap((p) => p.events.map((e) => e.id)),
    note: data.persons.flatMap((p) => p.notes.map((n) => n.id)),
    media: data.persons.flatMap((p) => p.media.map((m) => m.id)),
  };
}

/**
 * Ids of the import file that are already taken in the database but not in the target family tree – e.g.
 * when the same export is imported into a second family tree. Records of the target family tree (`existing`)
 * do not count: they are updated on purpose during the import. Archives, sources, citations and their scans do not
 * count either: the library is shared, the same id is the same record.
 */
export async function foreignIds(db: Db, data: TransferData, existing: TransferData): Promise<Set<string>> {
  const own = new Set(Object.values(idsOf(existing)).flat());
  const taken = new Set<string>();
  const lookups: Record<keyof ReturnType<typeof idsOf>, (ids: string[]) => Promise<Array<{ id: string }>>> = {
    person: (ids) => db.person.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    relation: (ids) => db.relation.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    event: (ids) => db.event.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    note: (ids) => db.note.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    media: (ids) => db.media.findMany({ where: { id: { in: ids } }, select: { id: true } }),
  };
  for (const [kind, ids] of Object.entries(idsOf(data)) as Array<[keyof typeof lookups, string[]]>) {
    const candidates = ids.filter((id) => !own.has(id));
    for (let i = 0; i < candidates.length; i += CHUNK) {
      for (const row of await lookups[kind](candidates.slice(i, i + CHUNK))) {
        taken.add(row.id);
      }
    }
  }
  return taken;
}

/**
 * Assigns new ids for the given ids and adjusts all references (relations, profile picture, media at
 * events, sources and citations). Without affected ids the file stays unchanged.
 */
export function remapIds(data: TransferData, ids: Set<string>, newId: () => string = randomUUID): TransferData {
  if (!ids.size) {
    return data;
  }
  const map = new Map([...ids].map((id) => [id, newId()]));
  const to = (id: string) => map.get(id) ?? id;
  return {
    ...data,
    persons: data.persons.map((p) => ({
      ...p,
      id: to(p.id),
      profilePictureId: p.profilePictureId ? to(p.profilePictureId) : p.profilePictureId,
      events: p.events.map((e) => ({ ...e, id: to(e.id), mediaIds: e.mediaIds.map(to).sort() })),
      notes: p.notes.map((n) => ({ ...n, id: to(n.id) })),
      media: p.media.map((m) => ({ ...m, id: to(m.id) })),
    })),
    relations: data.relations.map((r) => ({ ...r, id: to(r.id), personAId: to(r.personAId), personBId: to(r.personBId) })),
    // Sources and citations may link files of persons
    sources: data.sources.map((src) => ({ ...src, mediaIds: src.mediaIds.map(to).sort() })),
    citations: data.citations.map((c) => ({ ...c, mediaIds: c.mediaIds.map(to).sort() })),
  };
}

/** Empty data – the baseline when importing into a new family tree */
export const emptyTransfer = (): TransferData => ({
  format: FORMAT_NAME,
  version: FORMAT_VERSION,
  exportedAt: new Date().toISOString(),
  persons: [],
  relations: [],
  repositories: [],
  sources: [],
  citations: [],
  libraryMedia: [],
});
