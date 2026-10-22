import type { PrismaClient } from '../../generated/prisma/client.js';
import {
  sortedIds,
  sortedPersonCitations,
  type TransferCitation,
  type TransferData,
  type TransferMedia,
  type TransferRepository,
  type TransferSource,
} from './format.js';

/**
 * The library (archives, sources, citations and their scans) is shared by all family trees. An import does not copy
 * what is already there: a record with the same id is the same record, a record without one is recognised by its
 * content (an archive by its name, a source by type, title and author, a citation by source, page, date and
 * transcription). What the file brings is compared with these records and created or updated by the import plan.
 */

/** The records of the library that exist already, in the form of the exchange format, by id */
export interface LibraryState {
  repositories: Map<string, TransferRepository>;
  sources: Map<string, TransferSource>;
  citations: Map<string, TransferCitation>;
  media: Map<string, TransferMedia>;
}

export const emptyLibrary = (): LibraryState => ({ repositories: new Map(), sources: new Map(), citations: new Map(), media: new Map() });

type Db = Pick<PrismaClient, 'repository' | 'source' | 'citation' | 'media'>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();

const repositoryOf = (r: {
  id: string;
  name: string;
  address: string | null;
  url: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TransferRepository => ({ ...r, deletedAt: iso(r.deletedAt), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });

/**
 * Reads the library records the file refers to (by id) and, for the recognition, the keys of all others. Only small
 * columns are read for the keys; the transcriptions only of the citations of sources that occur in the file.
 */
export async function loadLibrary(db: Db, data: TransferData): Promise<{ state: LibraryState; keys: LibraryKeys }> {
  const ids = <T extends { id: string }>(rows: T[]) => rows.map((r) => r.id);
  const media = { select: { mediaId: true } } as const;
  const [repositories, sources, citations, libraryMedia, allRepositories, allSources] = await Promise.all([
    data.repositories.length ? db.repository.findMany({ where: { id: { in: ids(data.repositories) } } }) : [],
    data.sources.length ? db.source.findMany({ where: { id: { in: ids(data.sources) } }, include: { media } }) : [],
    data.citations.length ? db.citation.findMany({ where: { id: { in: ids(data.citations) } }, include: { media } }) : [],
    data.libraryMedia.length ? db.media.findMany({ where: { id: { in: ids(data.libraryMedia) }, familyTreeId: null } }) : [],
    data.repositories.length ? db.repository.findMany({ select: { id: true, name: true } }) : [],
    data.sources.length ? db.source.findMany({ select: { id: true, type: true, title: true, author: true } }) : [],
  ]);
  const state: LibraryState = {
    repositories: new Map(repositories.map((r) => [r.id, repositoryOf(r)])),
    sources: new Map(
      sources.map((s) => [
        s.id,
        {
          id: s.id,
          type: s.type,
          title: s.title,
          author: s.author,
          publication: s.publication,
          abbreviation: s.abbreviation,
          text: s.text,
          repositoryId: s.repositoryId,
          callNumber: s.callNumber,
          note: s.note,
          mediaIds: sortedIds(s.media.map((l) => l.mediaId)),
          isDeleted: s.isDeleted,
          deletedAt: iso(s.deletedAt),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        },
      ]),
    ),
    citations: new Map(
      citations.map((c) => [
        c.id,
        {
          id: c.id,
          sourceId: c.sourceId,
          page: c.page,
          date: c.date,
          datePrecision: c.datePrecision,
          text: c.text,
          quality: c.quality,
          note: c.note,
          mediaIds: sortedIds(c.media.map((l) => l.mediaId)),
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        },
      ]),
    ),
    media: new Map(
      libraryMedia.map((m) => [
        m.id,
        {
          id: m.id,
          path: '',
          originalFileName: m.originalFileName,
          mimeType: m.mimeType,
          sizeBytes: Number(m.sizeBytes),
          type: m.type,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        },
      ]),
    ),
  };
  return {
    state,
    keys: {
      repositories: allRepositories.map((r) => ({ id: r.id, key: repositoryKey(r) })),
      sources: allSources.map((s) => ({ id: s.id, key: sourceKey(s) })),
      // Citations are matched within a source: read once the sources of the file are known
      citationsOf: async (sourceIds: string[]) =>
        sourceIds.length
          ? (
              await db.citation.findMany({ where: { sourceId: { in: sourceIds } }, select: { id: true, sourceId: true, page: true, date: true, text: true } })
            ).map((c) => ({ id: c.id, key: citationKey(c) }))
          : [],
    },
  };
}

/** Keys of all records of the library, for the recognition by content */
export interface LibraryKeys {
  repositories: Array<{ id: string; key: string }>;
  sources: Array<{ id: string; key: string }>;
  citationsOf: (sourceIds: string[]) => Promise<Array<{ id: string; key: string }>>;
}

const repositoryKey = (r: { name: string }) => normalize(r.name);
const sourceKey = (s: { type: string; title: string; author?: string | null }) => [s.type, normalize(s.title), normalize(s.author)].join('|');
const citationKey = (c: { sourceId: string; page?: string | null; date?: string | null; text?: string | null }) =>
  [c.sourceId, normalize(c.page), normalize(c.date), normalize(c.text)].join('|');

/** Only keys that occur once count – two records with the same key stay apart */
function uniqueKeys(rows: Array<{ id: string; key: string }>) {
  const index = new Map<string, string | null>();
  for (const { id, key } of rows) {
    index.set(key, index.has(key) ? null : id);
  }
  return index;
}

/**
 * Gives records of the file that are not in the library under their id the id of an existing record with the same
 * content, and adjusts all references. Each existing record is taken at most once.
 */
export async function reconcileLibrary(data: TransferData, library: { state: LibraryState; keys: LibraryKeys }): Promise<TransferData> {
  const { state, keys } = library;
  const match = <T extends { id: string }>(records: T[], known: Map<string, unknown>, index: Map<string, string | null>, key: (r: T) => string) => {
    const map = new Map<string, string>();
    const claimed = new Set(records.filter((r) => known.has(r.id)).map((r) => r.id));
    for (const r of records) {
      if (known.has(r.id)) {
        continue;
      }
      const target = index.get(key(r));
      if (target && !claimed.has(target)) {
        map.set(r.id, target);
        claimed.add(target);
      }
    }
    return map;
  };

  const repositoryMap = match(data.repositories, state.repositories, uniqueKeys(keys.repositories), repositoryKey);
  const sourceMap = match(data.sources, state.sources, uniqueKeys(keys.sources), sourceKey);
  const toSource = (id: string) => sourceMap.get(id) ?? id;
  const citationIndex = uniqueKeys(await keys.citationsOf([...new Set(data.citations.map((c) => toSource(c.sourceId)))]));
  const citationMap = match(data.citations, state.citations, citationIndex, (c) => citationKey({ ...c, sourceId: toSource(c.sourceId) }));
  if (!repositoryMap.size && !sourceMap.size && !citationMap.size) {
    return data;
  }

  const repo = (id: string | null | undefined) => (id ? (repositoryMap.get(id) ?? id) : id);
  const cite = (id: string) => citationMap.get(id) ?? id;
  return {
    ...data,
    repositories: data.repositories.map((r) => ({ ...r, id: repo(r.id)! })),
    sources: data.sources.map((s) => ({ ...s, id: toSource(s.id), repositoryId: repo(s.repositoryId) })),
    citations: data.citations.map((c) => ({ ...c, id: cite(c.id), sourceId: toSource(c.sourceId) })),
    persons: data.persons.map((p) => ({
      ...p,
      citations: sortedPersonCitations(p.citations.map((l) => ({ ...l, citationId: cite(l.citationId) }))),
      events: p.events.map((e) => ({ ...e, citationIds: sortedIds(e.citationIds.map(cite)) })),
    })),
    relations: data.relations.map((r) => ({ ...r, citationIds: sortedIds(r.citationIds.map(cite)) })),
  };
}

/**
 * A file that knows nothing of citations (GEDCOM without sources, an export of version 1) must not remove the links of
 * the existing records: for persons, events and relations that exist already and come without links, the existing
 * links are kept.
 */
export function keepExistingLinks(data: TransferData, existing: TransferData): TransferData {
  const persons = new Map(existing.persons.map((p) => [p.id, p]));
  const events = new Map(existing.persons.flatMap((p) => p.events.map((e) => [e.id, e] as const)));
  const relations = new Map(existing.relations.map((r) => [r.id, r]));
  const library = { citations: new Map(existing.citations.map((c) => [c.id, c])), sources: new Map(existing.sources.map((s) => [s.id, s])) };
  const used = new Set<string>();
  const keep = <T>(own: T[], old: T[] | undefined, ids: (list: T[]) => string[]) => {
    if (own.length || !old?.length) {
      return own;
    }
    ids(old).forEach((id) => used.add(id));
    return old;
  };
  const result: TransferData = {
    ...data,
    persons: data.persons.map((p) => ({
      ...p,
      citations: keep(p.citations, persons.get(p.id)?.citations, (l) => l.map((c) => c.citationId)),
      events: p.events.map((e) => ({ ...e, citationIds: keep(e.citationIds, events.get(e.id)?.citationIds, (l) => l) })),
    })),
    relations: data.relations.map((r) => ({ ...r, citationIds: keep(r.citationIds, relations.get(r.id)?.citationIds, (l) => l) })),
  };
  if (!used.size) {
    return data;
  }
  // The kept links refer to citations of the existing data: take them (and their sources) into the file unchanged
  const fileCitations = new Set(data.citations.map((c) => c.id));
  const addCitations = [...used].filter((id) => !fileCitations.has(id)).flatMap((id) => library.citations.get(id) ?? []);
  const fileSources = new Set(data.sources.map((s) => s.id));
  const addSources = [...new Set(addCitations.map((c) => c.sourceId))].filter((id) => !fileSources.has(id)).flatMap((id) => library.sources.get(id) ?? []);
  const fileRepositories = new Set(data.repositories.map((r) => r.id));
  const existingRepositories = new Map(existing.repositories.map((r) => [r.id, r]));
  const addRepositories = [...new Set(addSources.map((s) => s.repositoryId).filter((id): id is string => !!id))]
    .filter((id) => !fileRepositories.has(id))
    .flatMap((id) => existingRepositories.get(id) ?? []);
  // Unchanged against the library, so the plan writes nothing for them; their scans are there already
  return {
    ...result,
    repositories: [...data.repositories, ...addRepositories],
    sources: [...data.sources, ...addSources],
    citations: [...data.citations, ...addCitations],
  };
}
