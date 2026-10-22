import type { PrismaClient } from '../generated/prisma/index.js';

/** At most this many places are suggested – the most used ones */
export const MAX_PLACES = 500;

/**
 * Places already used in the family tree (birth and death places of persons, places of life events), for the
 * suggestions while typing. Spellings that differ only in case or surrounding spaces count as one place, shown in its
 * most used spelling. Most used places first, then alphabetically.
 */
export async function placeSuggestions(prisma: PrismaClient, treeId: string): Promise<string[]> {
  const person = { familyTreeId: treeId, isDeleted: false };
  const [births, deaths, events] = await Promise.all([
    prisma.person.groupBy({ by: ['birthPlace'], where: { ...person, birthPlace: { not: null } }, _count: { _all: true } }),
    prisma.person.groupBy({ by: ['deathPlace'], where: { ...person, deathPlace: { not: null } }, _count: { _all: true } }),
    prisma.event.groupBy({ by: ['place'], where: { person, place: { not: null } }, _count: { _all: true } }),
  ]);
  const counts = [
    ...births.map((row) => [row.birthPlace, row._count._all] as const),
    ...deaths.map((row) => [row.deathPlace, row._count._all] as const),
    ...events.map((row) => [row.place, row._count._all] as const),
  ];

  // Per place: total count and the count of each spelling
  const places = new Map<string, { total: number; spellings: Map<string, number> }>();
  for (const [value, count] of counts) {
    const spelling = value?.trim();
    if (!spelling) {
      continue;
    }
    const key = spelling.toLocaleLowerCase();
    const place = places.get(key) ?? { total: 0, spellings: new Map<string, number>() };
    place.total += count;
    place.spellings.set(spelling, (place.spellings.get(spelling) ?? 0) + count);
    places.set(key, place);
  }

  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  return [...places.values()]
    .map(({ total, spellings }) => ({ total, name: [...spellings].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))[0][0] }))
    .sort((a, b) => b.total - a.total || collator.compare(a.name, b.name))
    .slice(0, MAX_PLACES)
    .map((place) => place.name);
}
