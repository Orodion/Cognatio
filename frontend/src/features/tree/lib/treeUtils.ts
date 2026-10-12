import type { Edge } from '@xyflow/react';

export interface TreeRelation {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  label?: string | null;
}

/** Views of the family tree */
export const TREE_VIEWS = ['tree', 'ancestors', 'descendants', 'network'] as const;
export type TreeView = (typeof TREE_VIEWS)[number];

/** Selectable generation depths; null = all */
export const DEPTH_OPTIONS = [2, 3, 5] as const;
export type Depth = number | null;

/** Views that only make sense starting from a focus person */
export const needsFocus = (view: TreeView) => view === 'ancestors' || view === 'descendants';

// Semantics of a relation: "personB is <type> of personA"
const PARENT_TYPES = ['MOTHER', 'FATHER'];
const CHILD_TYPES = ['CHILD'];
const PARTNER_TYPES = ['HUSBAND', 'WIFE', 'LIFE_PARTNER', 'PARTNER'];

/** Returns [parent, child] for parent-child relations, otherwise null. */
function parentChild(rel: TreeRelation): [string, string] | null {
  if (PARENT_TYPES.includes(rel.type)) {
    return [rel.personBId, rel.personAId];
  }
  if (CHILD_TYPES.includes(rel.type)) {
    return [rel.personAId, rel.personBId];
  }
  return null;
}

export interface FamilyIndex {
  parents: Map<string, Set<string>>;
  children: Map<string, Set<string>>;
  partners: Map<string, Set<string>>;
  /** All directly connected persons, regardless of the relation type */
  related: Map<string, Set<string>>;
}

function addTo(map: Map<string, Set<string>>, key: string, value: string) {
  let set = map.get(key);
  if (!set) {
    map.set(key, (set = new Set()));
  }
  set.add(value);
}

/** Builds lookup tables for parents, children and partners (only for persons in personIds). */
export function buildFamilyIndex(relations: TreeRelation[], personIds: Set<string>): FamilyIndex {
  const index: FamilyIndex = { parents: new Map(), children: new Map(), partners: new Map(), related: new Map() };
  for (const rel of relations) {
    if (!personIds.has(rel.personAId) || !personIds.has(rel.personBId)) {
      continue;
    }
    addTo(index.related, rel.personAId, rel.personBId);
    addTo(index.related, rel.personBId, rel.personAId);
    const pc = parentChild(rel);
    if (pc) {
      addTo(index.children, pc[0], pc[1]);
      addTo(index.parents, pc[1], pc[0]);
    } else if (PARTNER_TYPES.includes(rel.type)) {
      addTo(index.partners, rel.personAId, rel.personBId);
      addTo(index.partners, rel.personBId, rel.personAId);
    }
  }
  return index;
}

/** Breadth-first search along a neighbourhood (parents, children or all) up to the given depth; safe against cycles. */
function walk(start: string, next: Map<string, Set<string>>, depth: Depth): Set<string> {
  const found = new Set<string>([start]);
  let frontier = [start];
  for (let level = 0; frontier.length > 0 && (depth === null || level < depth); level++) {
    const nextFrontier: string[] = [];
    for (const id of frontier) {
      for (const n of next.get(id) ?? []) {
        if (found.has(n)) {
          continue;
        }
        found.add(n);
        nextFrontier.push(n);
      }
    }
    frontier = nextFrontier;
  }
  return found;
}

function withPartners(ids: Set<string>, index: FamilyIndex, of: Iterable<string>): Set<string> {
  const result = new Set(ids);
  for (const id of of) {
    for (const p of index.partners.get(id) ?? []) {
      result.add(p);
    }
  }
  return result;
}

/**
 * Determines the persons to show in a view.
 * - ancestors: focus person and their ancestors (up to the depth)
 * - descendants: focus person, their descendants (up to the depth) and their partners
 * - tree: without a focus person all; with one ancestors + descendants (up to the depth) including partners
 * - network: without a focus person all; with one all persons reachable via any relations
 *   (depth = number of relation steps)
 */
export function selectPersons(view: TreeView, focusId: string | null, depth: Depth, index: FamilyIndex, allIds: Set<string>): Set<string> {
  if (!focusId || !allIds.has(focusId)) {
    return needsFocus(view) ? new Set() : new Set(allIds);
  }

  if (view === 'network') {
    return walk(focusId, index.related, depth);
  }
  const ancestors = walk(focusId, index.parents, depth);
  const descendants = walk(focusId, index.children, depth);
  if (view === 'ancestors') {
    return ancestors;
  }
  if (view === 'descendants') {
    return withPartners(descendants, index, descendants);
  }
  return withPartners(new Set([...ancestors, ...descendants]), index, [focusId, ...descendants]);
}

/**
 * Assigns a generation to every person (parents −1, children +1, partners the same generation).
 * With a focus person relative to it (focus = 0); without one per family group from 0 for the top generation.
 * With contradictory data the first assignment found wins.
 */
export function assignGenerations(index: FamilyIndex, ids: Set<string>, focusId: string | null): Map<string, number> {
  const generation = new Map<string, number>();
  const hasFocus = !!focusId && ids.has(focusId);
  const starts = hasFocus ? [focusId!, ...ids] : [...ids];

  for (const start of starts) {
    if (generation.has(start)) {
      continue;
    }
    generation.set(start, 0);
    const component = [start];
    for (let i = 0; i < component.length; i++) {
      const id = component[i];
      const g = generation.get(id)!;
      const neighbours: Array<[Set<string> | undefined, number]> = [
        [index.parents.get(id), g - 1],
        [index.children.get(id), g + 1],
        [index.partners.get(id), g],
      ];
      for (const [set, value] of neighbours) {
        for (const n of set ?? []) {
          if (!ids.has(n) || generation.has(n)) {
            continue;
          }
          generation.set(n, value);
          component.push(n);
        }
      }
    }
    if (!(hasFocus && start === focusId)) {
      const min = Math.min(...component.map((id) => generation.get(id)!));
      for (const id of component) {
        generation.set(id, generation.get(id)! - min);
      }
    }
  }
  return generation;
}

/** Wandelt Relationen in Kanten um: Eltern -> Kind (hierarchisch), Partner (gestrichelt, horizontal). */
export function buildEdges(relations: TreeRelation[], personIds: Set<string>): { edges: Edge[]; layoutEdges: Edge[] } {
  const edges: Edge[] = [];
  const layoutEdges: Edge[] = [];
  const seen = new Set<string>();

  for (const rel of relations) {
    if (!personIds.has(rel.personAId) || !personIds.has(rel.personBId)) {
      continue;
    }

    const pc = parentChild(rel);
    if (pc) {
      const [parentId, childId] = pc;
      const key = `pc:${parentId}:${childId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const edge: Edge = { id: rel.id, source: parentId, target: childId, type: 'smoothstep' };
      edges.push(edge);
      layoutEdges.push(edge);
    } else if (PARTNER_TYPES.includes(rel.type)) {
      const key = `p:${[rel.personAId, rel.personBId].sort().join(':')}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      edges.push({
        id: rel.id,
        source: rel.personAId,
        target: rel.personBId,
        sourceHandle: 'partner-source',
        targetHandle: 'partner-target',
        type: 'partner',
        style: { strokeDasharray: '6 4' },
      });
    }
    // Siblings & others follow from common parents or are not drawn
  }

  return { edges, layoutEdges };
}

/** Relation group of a relation for the network view */
export type NetworkKind = 'parent' | 'partner' | 'sibling' | 'other';

/**
 * Edges of the network view: all relations (also siblings and others), once per pair of persons and group.
 * All edges are taken into account for the layout. `label` returns the label for other relations.
 */
export function buildNetworkEdges(relations: TreeRelation[], personIds: Set<string>, label: (rel: TreeRelation) => string): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const rel of relations) {
    if (!personIds.has(rel.personAId) || !personIds.has(rel.personBId)) {
      continue;
    }
    const pc = parentChild(rel);
    const kind: NetworkKind = pc ? 'parent' : PARTNER_TYPES.includes(rel.type) ? 'partner' : rel.type === 'SIBLING' ? 'sibling' : 'other';
    const [source, target] = pc ?? [rel.personAId, rel.personBId];
    const key = `${kind}:${kind === 'parent' ? `${source}:${target}` : [source, target].sort().join(':')}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    edges.push({
      id: rel.id,
      source,
      target,
      // The network is laid out from left to right – use side handles
      sourceHandle: 'partner-source',
      targetHandle: 'partner-target',
      type: 'default',
      data: { kind },
      label: kind === 'other' ? label(rel) : undefined,
      style: kind === 'partner' ? { strokeDasharray: '6 4' } : kind === 'sibling' || kind === 'other' ? { strokeDasharray: '2 4' } : undefined,
    });
  }
  return edges;
}
