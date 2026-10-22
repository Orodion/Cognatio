import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../generated/prisma/client.js';
import { removeUploadedFile } from '../lib/files/uploads.js';
import { linkableMedia, removeOrphanedLibraryMedia } from '../lib/libraryMedia.js';
import { storedDateText, validateDatePrecision } from '../lib/personValues.js';
import { MAX_LONG_LENGTH, MAX_SHORT_LENGTH, cleanText, requiredText, validateFact, validateQuality, validateSourceType } from '../lib/sourceValues.js';
import { searchSources } from '../lib/search/sourceSearch.js';
import { personInTree, type GraphQLContext } from '../lib/treeScope.js';
import { isoTimes } from './timestamps.js';

/**
 * Sources and citations: one library for all family trees. Archives, sources and citations belong to no family tree;
 * a citation supports facts (person fact, event, relation) of any family tree – a page of the active family tree sees
 * it through the links of its own persons.
 */

interface RepositoryInput {
  name: string;
  address?: string | null;
  url?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
}

interface SourceInput {
  type?: string | null;
  title: string;
  author?: string | null;
  publication?: string | null;
  abbreviation?: string | null;
  text?: string | null;
  repositoryId?: string | null;
  callNumber?: string | null;
  note?: string | null;
  /** Linked scans; without a value the links stay unchanged */
  mediaIds?: string[] | null;
}

interface CitationInput {
  sourceId: string;
  page?: string | null;
  date?: string | null;
  datePrecision?: string | null;
  text?: string | null;
  quality?: number | null;
  note?: string | null;
  /** Linked scans; without a value the links stay unchanged */
  mediaIds?: string[] | null;
}

/** A fact a citation supports: exactly one of person (with fact), event or relation */
export interface CitationTargetInput {
  personId?: string | null;
  fact?: string | null;
  eventId?: string | null;
  relationId?: string | null;
}

type Target = { kind: 'PERSON'; personId: string; fact: string } | { kind: 'EVENT'; eventId: string } | { kind: 'RELATION'; relationId: string };

/** How often a source is used: its citations and the facts they support (all family trees and the active one) */
interface Usage {
  citations: number;
  links: number;
  treeLinks: number;
}

const EMPTY_USAGE: Usage = { citations: 0, links: 0, treeLinks: 0 };

const notFound = (what: string, reason: string) => new GraphQLError(`${what} does not exist.`, { extensions: { code: 'NOT_FOUND', reason } });
const badInput = (message: string, reason: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', reason } });

// The scans and the number of supported facts are shown with every citation
const CITATION_INCLUDE = {
  media: { include: { media: true }, orderBy: { createdAt: 'asc' } },
  _count: { select: { persons: true, events: true, relations: true } },
} as const;

const SOURCE_INCLUDE = {
  repository: true,
  media: { include: { media: true }, orderBy: { createdAt: 'asc' } },
} as const;

/** A list of links (SourceMedia, CitationMedia) as the media themselves */
const linkedMedia = (links: Array<{ media: unknown }>) => links.map((link) => link.media);

function repositoryData(data: RepositoryInput) {
  return {
    name: requiredText(data.name, MAX_SHORT_LENGTH, 'The name', 'REPOSITORY_NAME_REQUIRED'),
    address: cleanText(data.address, MAX_SHORT_LENGTH, 'The address'),
    url: cleanText(data.url, MAX_SHORT_LENGTH, 'The web address'),
    email: cleanText(data.email, MAX_SHORT_LENGTH, 'The e-mail address'),
    phone: cleanText(data.phone, MAX_SHORT_LENGTH, 'The phone number'),
    note: cleanText(data.note, MAX_LONG_LENGTH, 'The note'),
  };
}

/** `currentRepositoryId`: the archive the source has now – it may stay although it is in the recycle bin */
async function sourceData(prisma: PrismaClient, data: SourceInput, currentRepositoryId?: string | null) {
  const repositoryId = data.repositoryId || null;
  if (
    repositoryId &&
    repositoryId !== currentRepositoryId &&
    !(await prisma.repository.findFirst({ where: { id: repositoryId, isDeleted: false }, select: { id: true } }))
  ) {
    throw notFound('Archive', 'REPOSITORY_NOT_FOUND');
  }
  return {
    type: validateSourceType(data.type),
    title: requiredText(data.title, MAX_SHORT_LENGTH, 'The title', 'SOURCE_TITLE_REQUIRED'),
    author: cleanText(data.author, MAX_SHORT_LENGTH, 'The author'),
    publication: cleanText(data.publication, MAX_SHORT_LENGTH, 'The publication'),
    abbreviation: cleanText(data.abbreviation, MAX_SHORT_LENGTH, 'The short title'),
    text: cleanText(data.text, MAX_LONG_LENGTH, 'The transcription'),
    repositoryId,
    callNumber: cleanText(data.callNumber, MAX_SHORT_LENGTH, 'The call number'),
    note: cleanText(data.note, MAX_LONG_LENGTH, 'The note'),
  };
}

async function citationData(prisma: PrismaClient, data: CitationInput) {
  await activeSource(prisma, data.sourceId);
  validateDatePrecision(data.datePrecision, 'datePrecision');
  const date = cleanText(storedDateText(data.date), MAX_SHORT_LENGTH, 'The date');
  return {
    sourceId: data.sourceId,
    page: cleanText(data.page, MAX_SHORT_LENGTH, 'The page'),
    date,
    datePrecision: date ? (data.datePrecision ?? null) : null,
    text: cleanText(data.text, MAX_LONG_LENGTH, 'The transcription'),
    quality: validateQuality(data.quality),
    note: cleanText(data.note, MAX_LONG_LENGTH, 'The note'),
  };
}

/** Without duplicates; all media must be scans of the library or files of the active family tree */
async function checkMediaIds(prisma: PrismaClient, treeId: string, mediaIds: string[] | null | undefined): Promise<string[] | null> {
  if (!mediaIds) {
    return null;
  }
  const ids = [...new Set(mediaIds)];
  if (ids.length && (await prisma.media.count({ where: { id: { in: ids }, ...linkableMedia(treeId) } })) !== ids.length) {
    throw badInput('At least one medium does not exist.', 'MEDIA_NOT_FOUND');
  }
  return ids;
}

async function findRepository(prisma: PrismaClient, id: string, isDeleted = false) {
  const repository = await prisma.repository.findFirst({ where: { id, isDeleted } });
  if (!repository) {
    throw notFound('Archive', 'REPOSITORY_NOT_FOUND');
  }
  return repository;
}

async function findSource(prisma: PrismaClient, id: string, isDeleted = false) {
  const source = await prisma.source.findFirst({ where: { id, isDeleted } });
  if (!source) {
    throw notFound('Source', 'SOURCE_NOT_FOUND');
  }
  return source;
}

const activeSource = (prisma: PrismaClient, id: string) => findSource(prisma, id, false);

/** Deleting for good is only possible from the recycle bin */
async function inRecycleBin(found: Promise<{ isDeleted: boolean } | null>, what: string, kind: 'SOURCE' | 'REPOSITORY') {
  const record = await found;
  if (!record) {
    throw notFound(what, `${kind}_NOT_FOUND`);
  }
  if (!record.isDeleted) {
    throw badInput(`Only ${what.toLowerCase()}s in the recycle bin can be deleted permanently.`, `${kind}_NOT_DELETED`);
  }
}

/** A citation whose source is not in the recycle bin */
async function findCitation(prisma: PrismaClient, id: string) {
  const citation = await prisma.citation.findFirst({ where: { id, source: { isDeleted: false } } });
  if (!citation) {
    throw notFound('Citation', 'CITATION_NOT_FOUND');
  }
  return citation;
}

/** Checks a fact of the active family tree – facts of other family trees count as not existing */
async function resolveTarget(prisma: PrismaClient, treeId: string, input: CitationTargetInput): Promise<Target> {
  const given = [input.personId, input.eventId, input.relationId].filter(Boolean);
  if (given.length !== 1) {
    throw badInput('A citation supports exactly one person, event or relation at a time.', 'INVALID_CITATION_TARGET');
  }
  if (input.personId) {
    await personInTree(prisma, treeId, input.personId);
    return { kind: 'PERSON', personId: input.personId, fact: validateFact(input.fact) };
  }
  if (input.eventId) {
    if (!(await prisma.event.findFirst({ where: { id: input.eventId, person: { familyTreeId: treeId } }, select: { id: true } }))) {
      throw notFound('Event', 'EVENT_NOT_FOUND');
    }
    return { kind: 'EVENT', eventId: input.eventId };
  }
  if (!(await prisma.relation.findFirst({ where: { id: input.relationId!, personA: { familyTreeId: treeId } }, select: { id: true } }))) {
    throw notFound('Relation', 'RELATION_NOT_FOUND');
  }
  return { kind: 'RELATION', relationId: input.relationId! };
}

type LinkDb = Pick<PrismaClient, 'person' | 'event' | 'relation'>;

/** A changed link counts as a change of the fact – decisive when imports are merged ("newer wins") */
async function touchTargets(db: LinkDb, targets: Target[]) {
  const now = new Date();
  const ids = (kind: Target['kind']) => [
    ...new Set(targets.flatMap((t) => (t.kind !== kind ? [] : [t.kind === 'PERSON' ? t.personId : t.kind === 'EVENT' ? t.eventId : t.relationId]))),
  ];
  const persons = ids('PERSON');
  const events = ids('EVENT');
  const relations = ids('RELATION');
  if (persons.length) {
    await db.person.updateMany({ where: { id: { in: persons } }, data: { updatedAt: now } });
  }
  if (events.length) {
    await db.event.updateMany({ where: { id: { in: events } }, data: { updatedAt: now } });
  }
  if (relations.length) {
    await db.relation.updateMany({ where: { id: { in: relations } }, data: { updatedAt: now } });
  }
}

/** Facts linked with a citation (for touching them when the citation goes) */
async function targetsOf(db: Pick<PrismaClient, 'personCitation' | 'eventCitation' | 'relationCitation'>, citationIds: string[]): Promise<Target[]> {
  const where = { citationId: { in: citationIds } };
  const [persons, events, relations] = await Promise.all([
    db.personCitation.findMany({ where, select: { personId: true, fact: true } }),
    db.eventCitation.findMany({ where, select: { eventId: true } }),
    db.relationCitation.findMany({ where, select: { relationId: true } }),
  ]);
  return [
    ...persons.map((l): Target => ({ kind: 'PERSON', personId: l.personId, fact: l.fact })),
    ...events.map((l): Target => ({ kind: 'EVENT', eventId: l.eventId })),
    ...relations.map((l): Target => ({ kind: 'RELATION', relationId: l.relationId })),
  ];
}

/**
 * Usage of all sources: number of citations, of supported facts in all family trees and in the active one. A fixed
 * number of grouped queries, independent of the number of sources.
 */
export async function sourceUsage(prisma: PrismaClient, treeId: string): Promise<Map<string, Usage>> {
  const count = { _count: { _all: true } } as const;
  const [citations, persons, personsInTree, events, eventsInTree, relations, relationsInTree] = await Promise.all([
    prisma.citation.findMany({ select: { id: true, sourceId: true } }),
    prisma.personCitation.groupBy({ by: ['citationId'], ...count }),
    prisma.personCitation.groupBy({ by: ['citationId'], where: { person: { familyTreeId: treeId } }, ...count }),
    prisma.eventCitation.groupBy({ by: ['citationId'], ...count }),
    prisma.eventCitation.groupBy({ by: ['citationId'], where: { event: { person: { familyTreeId: treeId } } }, ...count }),
    prisma.relationCitation.groupBy({ by: ['citationId'], ...count }),
    prisma.relationCitation.groupBy({ by: ['citationId'], where: { relation: { personA: { familyTreeId: treeId } } }, ...count }),
  ]);
  const sourceOf = new Map(citations.map((c) => [c.id, c.sourceId]));
  const usage = new Map<string, Usage>();
  const entry = (sourceId: string) => {
    let u = usage.get(sourceId);
    if (!u) {
      u = { ...EMPTY_USAGE };
      usage.set(sourceId, u);
    }
    return u;
  };
  for (const c of citations) {
    entry(c.sourceId).citations++;
  }
  const add = (rows: Array<{ citationId: string; _count: { _all: number } }>, field: 'links' | 'treeLinks') => {
    for (const row of rows) {
      const sourceId = sourceOf.get(row.citationId);
      if (sourceId) {
        entry(sourceId)[field] += row._count._all;
      }
    }
  };
  add(persons, 'links');
  add(events, 'links');
  add(relations, 'links');
  add(personsInTree, 'treeLinks');
  add(eventsInTree, 'treeLinks');
  add(relationsInTree, 'treeLinks');
  return usage;
}

async function withUsage<T extends { id: string }>(prisma: PrismaClient, treeId: string, sources: T[]): Promise<Array<T & { usage: Usage }>> {
  const usage = sources.length ? await sourceUsage(prisma, treeId) : new Map<string, Usage>();
  return sources.map((s) => ({ ...s, usage: usage.get(s.id) ?? EMPTY_USAGE }));
}

/** Media ids linked with a source and with its citations */
async function mediaOfSource(db: Pick<PrismaClient, 'sourceMedia' | 'citationMedia'>, sourceId: string) {
  const [own, ofCitations] = await Promise.all([
    db.sourceMedia.findMany({ where: { sourceId }, select: { mediaId: true } }),
    db.citationMedia.findMany({ where: { citation: { sourceId } }, select: { mediaId: true } }),
  ]);
  return [...own, ...ofCitations].map((l) => l.mediaId);
}

const removeFiles = (names: string[]) => names.forEach((name) => removeUploadedFile(name));

type CitationParent = {
  id: string;
  sourceId: string;
  source?: unknown;
  media?: Array<{ media: unknown }>;
  _count?: { persons: number; events: number; relations: number };
};

type SourceParent = {
  id: string;
  repositoryId?: string | null;
  repository?: { isDeleted: boolean } | null;
  media?: Array<{ media: unknown }>;
  usage?: Usage;
};

export const sourceResolvers = {
  Query: {
    // Archives of the library, by name
    repositories: (_: unknown, __: unknown, { prisma }: GraphQLContext) =>
      prisma.repository.findMany({ where: { isDeleted: false }, orderBy: [{ name: 'asc' }, { createdAt: 'asc' }] }),

    /**
     * Sources of the library, by title. TREE: those the active family tree uses plus the unused ones (just created,
     * all citations removed); ALL: every source.
     */
    sources: async (_: unknown, { scope }: { scope?: string | null }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const sources = await withUsage(
        prisma,
        tree,
        await prisma.source.findMany({ where: { isDeleted: false }, include: SOURCE_INCLUDE, orderBy: [{ title: 'asc' }, { createdAt: 'asc' }] }),
      );
      return scope === 'ALL' ? sources : sources.filter((s) => s.usage.treeLinks > 0 || s.usage.links === 0);
    },

    source: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      const source = await prisma.source.findFirst({ where: { id, isDeleted: false }, include: SOURCE_INCLUDE });
      return source ? (await withUsage(prisma, await treeId(), [source]))[0] : null;
    },

    // Sources whose fields, archive or citations contain all words of the search (with the search for persons)
    searchSources: async (_: unknown, { query }: { query: string }, { prisma, treeId }: GraphQLContext) =>
      withUsage(prisma, await treeId(), await searchSources(prisma, query)),

    /** Figures of the active family tree: used sources and citations, persons with at least one citation, the most cited sources */
    sourceStatistics: async (_: unknown, __: unknown, { prisma, treeId }: GraphQLContext) => {
      const familyTreeId = await treeId();
      const activeSource = { source: { isDeleted: false } };
      const cited = { some: { citation: activeSource } };
      const [persons, citedPersons, citations, usage, sources] = await Promise.all([
        prisma.person.count({ where: { familyTreeId, isDeleted: false } }),
        prisma.person.count({
          where: {
            familyTreeId,
            isDeleted: false,
            OR: [
              { citations: cited },
              { events: { some: { citations: cited } } },
              { relationsAsA: { some: { active: true, citations: cited } } },
              { relationsAsB: { some: { active: true, citations: cited } } },
            ],
          },
        }),
        prisma.citation.count({
          where: {
            ...activeSource,
            OR: [
              { persons: { some: { person: { familyTreeId } } } },
              { events: { some: { event: { person: { familyTreeId } } } } },
              { relations: { some: { relation: { personA: { familyTreeId } } } } },
            ],
          },
        }),
        sourceUsage(prisma, familyTreeId),
        prisma.source.findMany({ where: { isDeleted: false }, select: { id: true, title: true, abbreviation: true, type: true } }),
      ]);
      const used = sources
        .map((s) => ({ ...s, links: usage.get(s.id)?.treeLinks ?? 0 }))
        .filter((s) => s.links > 0)
        .sort((a, b) => b.links - a.links || a.title.localeCompare(b.title));
      return { persons, citedPersons, citations, sources: used.length, topSources: used.slice(0, 10) };
    },

    // Recycle bin of the library: deleted sources and archives, most recently deleted first
    deletedSources: async (_: unknown, __: unknown, { prisma, treeId }: GraphQLContext) =>
      withUsage(prisma, await treeId(), await prisma.source.findMany({ where: { isDeleted: true }, include: SOURCE_INCLUDE, orderBy: { deletedAt: 'desc' } })),
    deletedRepositories: (_: unknown, __: unknown, { prisma }: GraphQLContext) =>
      prisma.repository.findMany({ where: { isDeleted: true }, orderBy: { deletedAt: 'desc' } }),

    /** All citations of a person: of the person itself (by fact), of its events and of its relations */
    personCitations: async (_: unknown, { personId }: { personId: string }, { prisma, treeId }: GraphQLContext) => {
      await personInTree(prisma, await treeId(), personId);
      const citation = { source: { isDeleted: false } };
      const include = { citation: { include: { source: { include: { repository: true } }, ...CITATION_INCLUDE } } };
      const orderBy = { createdAt: 'asc' } as const;
      const [own, events, relations] = await Promise.all([
        prisma.personCitation.findMany({ where: { personId, citation }, include, orderBy }),
        prisma.eventCitation.findMany({ where: { event: { personId }, citation }, include, orderBy }),
        prisma.relationCitation.findMany({
          where: { relation: { active: true, OR: [{ personAId: personId }, { personBId: personId }] }, citation },
          include,
          orderBy,
        }),
      ]);
      return [
        ...own.map((l) => ({ kind: 'PERSON', fact: l.fact, eventId: null, relationId: null, citation: l.citation })),
        ...events.map((l) => ({ kind: 'EVENT', fact: null, eventId: l.eventId, relationId: null, citation: l.citation })),
        ...relations.map((l) => ({ kind: 'RELATION', fact: null, eventId: null, relationId: l.relationId, citation: l.citation })),
      ];
    },
  },

  Repository: {
    ...isoTimes('createdAt', 'updatedAt', 'deletedAt'),
    sourceCount: (repository: { id: string }, _: unknown, { prisma }: GraphQLContext) =>
      prisma.source.count({ where: { repositoryId: repository.id, isDeleted: false } }),
  },

  Source: {
    ...isoTimes('createdAt', 'updatedAt', 'deletedAt'),
    // An archive in the recycle bin is not shown; the link comes back with its restore
    repository: async (source: SourceParent, _: unknown, { prisma }: GraphQLContext) => {
      const repository =
        source.repository !== undefined
          ? source.repository
          : source.repositoryId
            ? await prisma.repository.findUnique({ where: { id: source.repositoryId } })
            : null;
      return repository && !repository.isDeleted ? repository : null;
    },
    media: async (source: SourceParent, _: unknown, { prisma }: GraphQLContext) =>
      linkedMedia(
        source.media ?? (await prisma.sourceMedia.findMany({ where: { sourceId: source.id }, include: { media: true }, orderBy: { createdAt: 'asc' } })),
      ),
    citations: (source: { id: string }, _: unknown, { prisma }: GraphQLContext) =>
      prisma.citation.findMany({
        where: { sourceId: source.id },
        include: CITATION_INCLUDE,
        orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
      }),
    citationCount: async (source: SourceParent, _: unknown, ctx: GraphQLContext) => (source.usage ?? (await usageOf(ctx, source.id))).citations,
    linkCount: async (source: SourceParent, _: unknown, ctx: GraphQLContext) => (source.usage ?? (await usageOf(ctx, source.id))).links,
    treeLinkCount: async (source: SourceParent, _: unknown, ctx: GraphQLContext) => (source.usage ?? (await usageOf(ctx, source.id))).treeLinks,
  },

  Citation: {
    ...isoTimes('createdAt', 'updatedAt'),
    source: (citation: CitationParent, _: unknown, { prisma }: GraphQLContext) =>
      citation.source ?? prisma.source.findUnique({ where: { id: citation.sourceId }, include: SOURCE_INCLUDE }),
    media: async (citation: CitationParent, _: unknown, { prisma }: GraphQLContext) =>
      linkedMedia(
        citation.media ??
          (await prisma.citationMedia.findMany({ where: { citationId: citation.id }, include: { media: true }, orderBy: { createdAt: 'asc' } })),
      ),
    // Facts in all family trees, also of persons in the recycle bin
    linkCount: async (citation: CitationParent, _: unknown, { prisma }: GraphQLContext) => {
      if (citation._count) {
        return citation._count.persons + citation._count.events + citation._count.relations;
      }
      const where = { citationId: citation.id };
      const counts = await Promise.all([
        prisma.personCitation.count({ where }),
        prisma.eventCitation.count({ where }),
        prisma.relationCitation.count({ where }),
      ]);
      return counts.reduce((sum, n) => sum + n, 0);
    },
    /** The supported facts with their person and family tree – without family trees in the recycle bin and deleted relations */
    links: async (citation: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      const visibleTree = { familyTree: { isDeleted: false } };
      const orderBy = { createdAt: 'asc' } as const;
      const [persons, events, relations] = await Promise.all([
        prisma.personCitation.findMany({
          where: { citationId: citation.id, person: visibleTree },
          include: { person: { include: { familyTree: true } } },
          orderBy,
        }),
        prisma.eventCitation.findMany({
          where: { citationId: citation.id, event: { person: visibleTree } },
          include: { event: { include: { person: { include: { familyTree: true } } } } },
          orderBy,
        }),
        prisma.relationCitation.findMany({
          where: { citationId: citation.id, relation: { active: true, personA: visibleTree } },
          include: { relation: { include: { personA: { include: { familyTree: true } }, personB: true } } },
          orderBy,
        }),
      ]);
      const tree = (t: { id: string; name: string }) => ({ familyTreeId: t.id, familyTreeName: t.name });
      return [
        ...persons.map((l) => ({ kind: 'PERSON', fact: l.fact, person: l.person, ...tree(l.person.familyTree) })),
        ...events.map((l) => ({
          kind: 'EVENT',
          person: l.event.person,
          eventId: l.event.id,
          eventTitle: l.event.title,
          eventDate: l.event.date,
          ...tree(l.event.person.familyTree),
        })),
        ...relations.map((l) => ({
          kind: 'RELATION',
          person: l.relation.personA,
          otherPerson: l.relation.personB,
          relationId: l.relation.id,
          relationType: l.relation.type,
          ...tree(l.relation.personA.familyTree),
        })),
      ];
    },
  },

  Mutation: {
    createRepository: (_: unknown, { data }: { data: RepositoryInput }, { prisma }: GraphQLContext) => prisma.repository.create({ data: repositoryData(data) }),

    updateRepository: async (_: unknown, { id, data }: { id: string; data: RepositoryInput }, { prisma }: GraphQLContext) => {
      await findRepository(prisma, id);
      return prisma.repository.update({ where: { id }, data: repositoryData(data) });
    },

    // Into the recycle bin – its sources keep the link and show no archive until it is restored
    deleteRepository: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await findRepository(prisma, id);
      await prisma.repository.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      return true;
    },

    restoreRepository: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await findRepository(prisma, id, true);
      return prisma.repository.update({ where: { id }, data: { isDeleted: false, deletedAt: null } });
    },

    // Only from the recycle bin; its sources stay, without archive
    hardDeleteRepository: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await inRecycleBin(prisma.repository.findUnique({ where: { id }, select: { isDeleted: true } }), 'Archive', 'REPOSITORY');
      await prisma.repository.delete({ where: { id } });
      return true;
    },

    createSource: async (_: unknown, { data }: { data: SourceInput }, { prisma, treeId }: GraphQLContext) => {
      const values = await sourceData(prisma, data);
      const mediaIds = await checkMediaIds(prisma, await treeId(), data.mediaIds);
      const source = await prisma.source.create({
        data: { ...values, ...(mediaIds?.length ? { media: { create: mediaIds.map((mediaId) => ({ mediaId })) } } : {}) },
        include: SOURCE_INCLUDE,
      });
      return { ...source, usage: EMPTY_USAGE };
    },

    updateSource: async (_: unknown, { id, data }: { id: string; data: SourceInput }, { prisma, treeId }: GraphQLContext) => {
      const current = await activeSource(prisma, id);
      const tree = await treeId();
      const values = await sourceData(prisma, data, current.repositoryId);
      const mediaIds = await checkMediaIds(prisma, tree, data.mediaIds);
      const { source, files } = await prisma.$transaction(async (tx) => {
        const before = mediaIds ? (await tx.sourceMedia.findMany({ where: { sourceId: id }, select: { mediaId: true } })).map((l) => l.mediaId) : [];
        const updated = await tx.source.update({
          where: { id },
          data: {
            ...values,
            ...(mediaIds
              ? {
                  media: {
                    deleteMany: { mediaId: { notIn: mediaIds } },
                    createMany: { data: mediaIds.map((mediaId) => ({ mediaId })), skipDuplicates: true },
                  },
                }
              : {}),
          },
          include: SOURCE_INCLUDE,
        });
        // A scan of the library that is no longer linked anywhere goes with its file
        return {
          source: updated,
          files: await removeOrphanedLibraryMedia(
            tx,
            before.filter((m) => !mediaIds?.includes(m)),
          ),
        };
      });
      removeFiles(files);
      return (await withUsage(prisma, tree, [source]))[0];
    },

    // Into the recycle bin together with its citations: they disappear from the persons in all family trees
    deleteSource: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await activeSource(prisma, id);
      await prisma.source.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      return true;
    },

    restoreSource: async (_: unknown, { id }: { id: string }, { prisma, treeId }: GraphQLContext) => {
      await findSource(prisma, id, true);
      const source = await prisma.source.update({ where: { id }, data: { isDeleted: false, deletedAt: null }, include: SOURCE_INCLUDE });
      return (await withUsage(prisma, await treeId(), [source]))[0];
    },

    // Only from the recycle bin, with its citations and their links; scans that nothing else links go as well
    hardDeleteSource: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await inRecycleBin(prisma.source.findUnique({ where: { id }, select: { isDeleted: true } }), 'Source', 'SOURCE');
      const files = await prisma.$transaction(async (tx) => {
        const media = await mediaOfSource(tx, id);
        const citationIds = (await tx.citation.findMany({ where: { sourceId: id }, select: { id: true } })).map((c) => c.id);
        await touchTargets(tx, await targetsOf(tx, citationIds));
        await tx.source.delete({ where: { id } });
        return removeOrphanedLibraryMedia(tx, media);
      });
      removeFiles(files);
      return true;
    },

    /** New citation, linked right away with the given facts of the active family tree (e.g. the birth it proves) */
    createCitation: async (
      _: unknown,
      { data, targets }: { data: CitationInput; targets?: CitationTargetInput[] | null },
      { prisma, treeId }: GraphQLContext,
    ) => {
      const tree = await treeId();
      const values = await citationData(prisma, data);
      const mediaIds = await checkMediaIds(prisma, tree, data.mediaIds);
      const resolved = await Promise.all((targets ?? []).map((t) => resolveTarget(prisma, tree, t)));
      return prisma.$transaction(async (tx) => {
        const citation = await tx.citation.create({
          data: { ...values, ...(mediaIds?.length ? { media: { create: mediaIds.map((mediaId) => ({ mediaId })) } } : {}) },
        });
        await createLinks(tx, citation.id, resolved);
        return tx.citation.findUniqueOrThrow({ where: { id: citation.id }, include: CITATION_INCLUDE });
      });
    },

    updateCitation: async (_: unknown, { id, data }: { id: string; data: CitationInput }, { prisma, treeId }: GraphQLContext) => {
      await findCitation(prisma, id);
      const values = await citationData(prisma, data);
      const mediaIds = await checkMediaIds(prisma, await treeId(), data.mediaIds);
      const { citation, files } = await prisma.$transaction(async (tx) => {
        const before = mediaIds ? (await tx.citationMedia.findMany({ where: { citationId: id }, select: { mediaId: true } })).map((l) => l.mediaId) : [];
        const updated = await tx.citation.update({
          where: { id },
          data: {
            ...values,
            ...(mediaIds
              ? {
                  media: {
                    deleteMany: { mediaId: { notIn: mediaIds } },
                    createMany: { data: mediaIds.map((mediaId) => ({ mediaId })), skipDuplicates: true },
                  },
                }
              : {}),
          },
          include: CITATION_INCLUDE,
        });
        await touchTargets(tx, await targetsOf(tx, [id]));
        return {
          citation: updated,
          files: await removeOrphanedLibraryMedia(
            tx,
            before.filter((m) => !mediaIds?.includes(m)),
          ),
        };
      });
      removeFiles(files);
      return citation;
    },

    // For good, with its links in all family trees (the page asks first and names their number)
    deleteCitation: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      await findCitation(prisma, id);
      const files = await prisma.$transaction(async (tx) => {
        const media = (await tx.citationMedia.findMany({ where: { citationId: id }, select: { mediaId: true } })).map((l) => l.mediaId);
        await touchTargets(tx, await targetsOf(tx, [id]));
        await tx.citation.delete({ where: { id } });
        return removeOrphanedLibraryMedia(tx, media);
      });
      removeFiles(files);
      return true;
    },

    /** Links a citation with facts of the active family tree; links that exist already stay */
    linkCitation: async (_: unknown, { citationId, targets }: { citationId: string; targets: CitationTargetInput[] }, { prisma, treeId }: GraphQLContext) => {
      await findCitation(prisma, citationId);
      const tree = await treeId();
      const resolved = await Promise.all(targets.map((t) => resolveTarget(prisma, tree, t)));
      return prisma.$transaction(async (tx) => {
        await createLinks(tx, citationId, resolved);
        return tx.citation.findUniqueOrThrow({ where: { id: citationId }, include: CITATION_INCLUDE });
      });
    },

    unlinkCitation: async (_: unknown, { citationId, target }: { citationId: string; target: CitationTargetInput }, { prisma, treeId }: GraphQLContext) => {
      await findCitation(prisma, citationId);
      const resolved = await resolveTarget(prisma, await treeId(), target);
      return prisma.$transaction(async (tx) => {
        if (resolved.kind === 'PERSON') {
          await tx.personCitation.deleteMany({ where: { citationId, personId: resolved.personId, fact: resolved.fact } });
        } else if (resolved.kind === 'EVENT') {
          await tx.eventCitation.deleteMany({ where: { citationId, eventId: resolved.eventId } });
        } else {
          await tx.relationCitation.deleteMany({ where: { citationId, relationId: resolved.relationId } });
        }
        await touchTargets(tx, [resolved]);
        return tx.citation.findUniqueOrThrow({ where: { id: citationId }, include: CITATION_INCLUDE });
      });
    },
  },
};

async function usageOf({ prisma, treeId }: GraphQLContext, sourceId: string): Promise<Usage> {
  return (await sourceUsage(prisma, await treeId())).get(sourceId) ?? EMPTY_USAGE;
}

type CreateLinkDb = Pick<PrismaClient, 'personCitation' | 'eventCitation' | 'relationCitation' | 'person' | 'event' | 'relation'>;

async function createLinks(tx: CreateLinkDb, citationId: string, targets: Target[]) {
  const persons = targets.flatMap((t) => (t.kind === 'PERSON' ? [{ citationId, personId: t.personId, fact: t.fact }] : []));
  const events = targets.flatMap((t) => (t.kind === 'EVENT' ? [{ citationId, eventId: t.eventId }] : []));
  const relations = targets.flatMap((t) => (t.kind === 'RELATION' ? [{ citationId, relationId: t.relationId }] : []));
  if (persons.length) {
    await tx.personCitation.createMany({ data: persons, skipDuplicates: true });
  }
  if (events.length) {
    await tx.eventCitation.createMany({ data: events, skipDuplicates: true });
  }
  if (relations.length) {
    await tx.relationCitation.createMany({ data: relations, skipDuplicates: true });
  }
  await touchTargets(tx, targets);
}
