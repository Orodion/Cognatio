import type { PrismaClient } from '../../generated/prisma/client.js';

type Db = Pick<PrismaClient, 'person' | 'relation' | 'familyTree' | 'event'>;

/** Persons of the family tree (without the recycle bin, newest first like the person list) and its active relations */
export async function loadStatisticsData(db: Db, treeId: string) {
  const [persons, relations] = await Promise.all([
    db.person.findMany({ where: { familyTreeId: treeId, isDeleted: false }, orderBy: { createdAt: 'desc' } }),
    db.relation.findMany({
      where: { active: true, personA: { familyTreeId: treeId } },
      select: { personAId: true, personBId: true, type: true, startDate: true, endDate: true },
    }),
  ]);
  return { persons, relations };
}

const ids = (rows: Array<{ id: string }>) => new Set(rows.map((r) => r.id));

/** What the figures of completeness, weddings and the ancestors need besides persons and relations */
export async function loadStatisticsContext(db: Db, treeId: string) {
  const inTree = { familyTreeId: treeId, isDeleted: false };
  const cited = { some: { citation: { source: { isDeleted: false } } } };
  const [tree, withMedia, withCitation, weddingEvents, placeEvents] = await Promise.all([
    db.familyTree.findUnique({ where: { id: treeId }, select: { homePersonId: true } }),
    db.person.findMany({
      where: { ...inTree, OR: [{ profilePictureId: { not: null } }, { media: { some: {} } }, { events: { some: { media: { some: {} } } } }] },
      select: { id: true },
    }),
    db.person.findMany({
      where: {
        ...inTree,
        OR: [
          { citations: cited },
          { events: { some: { citations: cited } } },
          { relationsAsA: { some: { active: true, citations: cited } } },
          { relationsAsB: { some: { active: true, citations: cited } } },
        ],
      },
      select: { id: true },
    }),
    db.event.findMany({ where: { category: 'WEDDING', person: inTree }, select: { personId: true, date: true } }),
    db.event.findMany({
      where: { place: { not: null }, person: inTree },
      select: { personId: true, category: true, date: true, place: true, sortOrder: true },
    }),
  ]);
  return { homePersonId: tree?.homePersonId ?? null, withMedia: ids(withMedia), cited: ids(withCitation), weddingEvents, placeEvents };
}
