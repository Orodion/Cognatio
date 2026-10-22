import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { searchTerms } from './search.js';

const SOURCE_FIELDS = ['title', 'author', 'publication', 'abbreviation', 'text', 'callNumber', 'note'] as const;
const CITATION_FIELDS = ['page', 'text', 'note'] as const;

/** At most this many sources are listed with the search for persons */
export const MAX_SOURCE_HITS = 20;

const contains = (term: string) => ({ contains: term, mode: 'insensitive' as const });

/** Condition for one term: a field of the source, the name of its archive or a citation of it (page, transcription, note) */
function termCondition(term: string): Prisma.SourceWhereInput {
  return {
    OR: [
      ...SOURCE_FIELDS.map((field) => ({ [field]: contains(term) })),
      { repository: { name: contains(term) } },
      { citations: { some: { OR: CITATION_FIELDS.map((field) => ({ [field]: contains(term) })) } } },
    ],
  };
}

/**
 * Sources of the library (all family trees) in which every term occurs – in the source, its archive or one of its
 * citations; without the recycle bin, by title.
 */
export async function searchSources(db: Pick<PrismaClient, 'source'>, query: string) {
  const terms = searchTerms(query);
  if (!terms.length) {
    return [];
  }
  return db.source.findMany({
    where: { isDeleted: false, AND: terms.map(termCondition) },
    include: { repository: true, media: { include: { media: true }, orderBy: { createdAt: 'asc' } } },
    orderBy: [{ title: 'asc' }, { createdAt: 'asc' }],
    take: MAX_SOURCE_HITS,
  });
}
