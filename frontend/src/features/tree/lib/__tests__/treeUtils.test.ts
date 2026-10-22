import { describe, it, expect } from 'vitest';
import { assignGenerations, buildEdges, buildFamilyIndex, buildNetworkEdges, selectPersons } from '../treeUtils';

const ids = new Set(['kind', 'mother', 'father', 'deleted']);

describe('buildEdges', () => {
  it('draws parent -> child edges for all parent/child relation types', () => {
    const { layoutEdges } = buildEdges(
      [
        { id: 'r1', personAId: 'kind', personBId: 'mother', type: 'MOTHER' },
        { id: 'r2', personAId: 'father', personBId: 'kind', type: 'CHILD' },
      ],
      ids,
    );
    expect(layoutEdges.map((e) => [e.source, e.target])).toEqual([
      ['mother', 'kind'],
      ['father', 'kind'],
    ]);
  });

  it('draws partner edges only once and keeps them out of the layout', () => {
    const { edges, layoutEdges } = buildEdges(
      [
        { id: 'p1', personAId: 'mother', personBId: 'father', type: 'HUSBAND' },
        { id: 'p2', personAId: 'father', personBId: 'mother', type: 'WIFE' },
      ],
      ids,
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].sourceHandle).toBe('partner-source');
    expect(layoutEdges).toHaveLength(0);
  });

  it('skips relations to persons that are not in the tree', () => {
    const { edges } = buildEdges([{ id: 'r1', personAId: 'kind', personBId: 'unbekannt', type: 'FATHER' }], ids);
    expect(edges).toHaveLength(0);
  });
});

// Family: otto ∞ olga → viktor, udo; viktor ∞ maria → karl → emil; tante is "other" of maria
const family = [
  { id: 'e1', personAId: 'otto', personBId: 'olga', type: 'WIFE' },
  { id: 'k1', personAId: 'otto', personBId: 'viktor', type: 'CHILD' },
  { id: 'k2', personAId: 'viktor', personBId: 'olga', type: 'MOTHER' },
  { id: 'k3', personAId: 'udo', personBId: 'otto', type: 'FATHER' },
  { id: 'g1', personAId: 'viktor', personBId: 'udo', type: 'SIBLING' },
  { id: 'e2', personAId: 'viktor', personBId: 'maria', type: 'WIFE' },
  { id: 'k4', personAId: 'maria', personBId: 'karl', type: 'CHILD' },
  { id: 'k5', personAId: 'karl', personBId: 'viktor', type: 'FATHER' },
  { id: 'k6', personAId: 'karl', personBId: 'emil', type: 'CHILD' },
  { id: 's1', personAId: 'maria', personBId: 'tante', type: 'OTHER', label: 'Patentante' },
];
const all = new Set(['otto', 'olga', 'viktor', 'udo', 'maria', 'karl', 'emil', 'tante']);
const index = buildFamilyIndex(family, all);
const sorted = (s: Set<string>) => [...s].sort();

describe('buildFamilyIndex', () => {
  it('collects parents, children and partners in both directions', () => {
    expect(sorted(index.parents.get('karl')!)).toEqual(['maria', 'viktor']);
    expect(sorted(index.children.get('otto')!)).toEqual(['udo', 'viktor']);
    expect(sorted(index.partners.get('maria')!)).toEqual(['viktor']);
    expect(index.related.get('maria')!.has('tante')).toBe(true);
  });
});

describe('selectPersons', () => {
  it('ancestors: focus person and all ancestors, limited by depth', () => {
    expect(sorted(selectPersons('ancestors', 'emil', null, index, all))).toEqual(['emil', 'karl', 'maria', 'olga', 'otto', 'viktor']);
    expect(sorted(selectPersons('ancestors', 'emil', 2, index, all))).toEqual(['emil', 'karl', 'maria', 'viktor']);
  });

  it('descendants: includes partners of the descendants, limited by depth', () => {
    expect(sorted(selectPersons('descendants', 'otto', 2, index, all))).toEqual(['karl', 'maria', 'olga', 'otto', 'udo', 'viktor']);
    expect(selectPersons('descendants', 'otto', null, index, all).has('emil')).toBe(true);
  });

  it('ancestor and descendant charts need a focus person', () => {
    expect(selectPersons('ancestors', null, null, index, all).size).toBe(0);
    expect(selectPersons('descendants', 'unbekannt', null, index, all).size).toBe(0);
  });

  it('tree: everyone without focus person, relatives within depth with focus person', () => {
    expect(selectPersons('tree', null, 2, index, all)).toEqual(all);
    // Karl ± 1 generation: parents and child – not the grandparents, not the uncle
    expect(sorted(selectPersons('tree', 'karl', 1, index, all))).toEqual(['emil', 'karl', 'maria', 'viktor']);
  });

  it('network: follows every kind of relation, depth counts relation steps', () => {
    expect(sorted(selectPersons('network', 'maria', 1, index, all))).toEqual(['karl', 'maria', 'tante', 'viktor']);
    expect(selectPersons('network', 'maria', 2, index, all).has('udo')).toBe(true);
  });

  it('is safe against cyclic data', () => {
    const ids = new Set(['a', 'b']);
    const cyclic = buildFamilyIndex(
      [
        { id: 'c1', personAId: 'a', personBId: 'b', type: 'CHILD' },
        { id: 'c2', personAId: 'b', personBId: 'a', type: 'CHILD' },
      ],
      ids,
    );
    expect(sorted(selectPersons('ancestors', 'a', null, cyclic, ids))).toEqual(['a', 'b']);
  });
});

describe('buildNetworkEdges', () => {
  it('draws every relation once per pair and labels other relations', () => {
    const edges = buildNetworkEdges(family, all, (rel) => rel.label ?? rel.type);
    const kinds = edges.map((e) => (e.data as { kind: string }).kind);
    expect(kinds.filter((k) => k === 'parent')).toHaveLength(6);
    expect(kinds.filter((k) => k === 'partner')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'sibling')).toHaveLength(1);
    expect(edges.find((e) => e.id === 's1')?.label).toBe('Patentante');
    // Parent-child edges point from the parent to the child
    expect(edges.find((e) => e.id === 'k5')).toMatchObject({ source: 'viktor', target: 'karl' });
  });
});

describe('assignGenerations', () => {
  it('counts the generations of a very large family group', () => {
    // More persons than Math.min(...values) can take
    const many = Array.from({ length: 300_000 }, (_, i) => `p${i}`);
    const relations = many.slice(1).map((id, i) => ({ id: `r${i}`, personAId: id, personBId: many[i], type: 'FATHER' }));
    const all = new Set(many);
    const gen = assignGenerations(buildFamilyIndex(relations, all), all, null);
    expect([gen.get(many[0]), gen.get(many[many.length - 1])]).toEqual([0, many.length - 1]);
  });

  it('numbers generations relative to the focus person; partners share a generation', () => {
    const gen = assignGenerations(index, all, 'karl');
    expect(Object.fromEntries(gen)).toMatchObject({ karl: 0, viktor: -1, maria: -1, otto: -2, olga: -2, udo: -1, emil: 1 });
  });

  it('starts at 0 for the top generation of each family without focus person', () => {
    const gen = assignGenerations(index, all, null);
    expect(gen.get('otto')).toBe(0);
    expect(gen.get('olga')).toBe(0);
    expect(gen.get('emil')).toBe(3);
    // "Other" relations do not connect generations: the aunt forms a group of her own
    expect(gen.get('tante')).toBe(0);
  });

  it('only considers the selected persons', () => {
    const gen = assignGenerations(index, new Set(['karl', 'emil']), null);
    expect(Object.fromEntries(gen)).toEqual({ karl: 0, emil: 1 });
  });
});
