import { buildFamilyIndex, selectPersons, type TreeRelation } from '@/features/tree/lib/treeUtils';

/**
 * Persons of the relationship graph of a person: the person, their parents, children and partners (and the partners of
 * the children, as in the family tree with one generation) and everybody else the person is directly related to
 * (siblings and other relations, e.g. a godfather).
 */
export function relationGraphIds(personId: string, personIds: Iterable<string>, relations: TreeRelation[]): Set<string> {
  const all = new Set(personIds);
  if (!all.has(personId)) {
    return new Set();
  }
  const index = buildFamilyIndex(relations, all);
  const ids = selectPersons('tree', personId, 1, index, all);
  for (const other of index.related.get(personId) ?? []) {
    ids.add(other);
  }
  return ids;
}
