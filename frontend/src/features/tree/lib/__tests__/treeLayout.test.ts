import { describe, it, expect } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { familyEdges, familyPath, groupPartners, layoutTree, NODE_WIDTH, partnerLine, type FamilyEdgeData } from '../treeLayout';

const partner = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target });
const node = (id: string): Node => ({ id, position: { x: 0, y: 0 }, data: {} });

describe('groupPartners', () => {
  it('puts partners into one block, following the partner chain', () => {
    const blocks = groupPartners(['frau1', 'mann', 'frau2', 'kind'], [partner('mann', 'frau1'), partner('mann', 'frau2')]);
    expect(blocks).toEqual([['frau1', 'mann', 'frau2'], ['kind']]);
  });

  it('ignores partner edges to persons outside the view', () => {
    expect(groupPartners(['a'], [partner('a', 'b')])).toEqual([['a']]);
  });
});

describe('layoutTree', () => {
  // Opa ∞ Oma → Vater, Onkel; Vater ∞ Mutter → Kind
  const nodes = ['opa', 'oma', 'father', 'onkel', 'mother', 'kind'].map(node);
  const parentEdges: Edge[] = [
    { id: '1', source: 'opa', target: 'father' },
    { id: '2', source: 'oma', target: 'father' },
    { id: '3', source: 'opa', target: 'onkel' },
    { id: '4', source: 'oma', target: 'onkel' },
    { id: '5', source: 'father', target: 'kind' },
    { id: '6', source: 'mother', target: 'kind' },
  ];
  const layout = layoutTree(nodes, parentEdges, [partner('opa', 'oma'), partner('father', 'mother')]);
  const pos = (id: string) => layout.find((n) => n.id === id)!.position;

  it('places generations from top to bottom', () => {
    expect(pos('opa').y).toBeLessThan(pos('father').y);
    expect(pos('father').y).toBeLessThan(pos('kind').y);
    expect(pos('mother').y).toBe(pos('father').y);
  });

  it('keeps partners side by side without anyone in between', () => {
    const [left, right] = [pos('father').x, pos('mother').x].sort((a, b) => a - b);
    expect(right - left).toBeGreaterThanOrEqual(NODE_WIDTH);
    expect(right - left).toBeLessThan(2 * NODE_WIDTH);
    expect(pos('onkel').x < left || pos('onkel').x > right).toBe(true);
  });
  it('never lets cards of the same generation overlap or touch', () => {
    // Wide family: many siblings, each with a partner, plus a second branch
    const ids = ['g1', 'g2', ...Array.from({ length: 5 }, (_, i) => [`c${i}`, `s${i}`]).flat(), 'x1', 'x2', 'xc'];
    const edges: Edge[] = [
      ...Array.from({ length: 5 }, (_, i) => [`g1`, `g2`].map((p) => ({ id: `${p}-c${i}`, source: p, target: `c${i}` }))).flat(),
      { id: 'x1-xc', source: 'x1', target: 'xc' },
      { id: 'x2-xc', source: 'x2', target: 'xc' },
    ];
    const partnerEdges = [partner('g1', 'g2'), partner('x1', 'x2'), ...Array.from({ length: 5 }, (_, i) => partner(`c${i}`, `s${i}`))];
    const result = layoutTree(ids.map(node), edges, partnerEdges);
    const rows = new Map<number, number[]>();
    for (const n of result) {
      rows.set(n.position.y, [...(rows.get(n.position.y) ?? []), n.position.x]);
    }
    for (const xs of rows.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThan(NODE_WIDTH);
      }
    }
  });
});

describe('family lines (four generations)', () => {
  // Konrad ∞ Helga → Walter; Irmgard ∞ Bruno → Frieda; Walter ∞ Frieda → Heinz;
  // Ludwig ∞ Greta → Ilse; Ilse ∞ Heinz → Paul
  const ids = ['konrad', 'helga', 'irmgard', 'bruno', 'walter', 'frieda', 'ludwig', 'greta', 'heinz', 'ilse', 'paul'];
  const child = (parents: string[], kind: string): Edge[] => parents.map((p) => ({ id: `${p}-${kind}`, source: p, target: kind }));
  const parentEdges = [
    ...child(['konrad', 'helga'], 'walter'),
    ...child(['irmgard', 'bruno'], 'frieda'),
    ...child(['walter', 'frieda'], 'heinz'),
    ...child(['ludwig', 'greta'], 'ilse'),
    ...child(['ilse', 'heinz'], 'paul'),
  ];
  // Partner edges deliberately recorded in the "unfavourable" direction
  const partners = [partner('konrad', 'helga'), partner('irmgard', 'bruno'), partner('frieda', 'walter'), partner('ludwig', 'greta'), partner('ilse', 'heinz')];
  const layout = layoutTree(ids.map(node), parentEdges, partners);
  const x = (id: string) => layout.find((n) => n.id === id)!.position.x;
  const edges = familyEdges(layout, parentEdges, partners);

  it('puts each partner on the side of their own parents', () => {
    const middle = (a: string, b: string) => (x(a) + x(b)) / 2;
    expect(x('walter') < x('frieda')).toBe(middle('konrad', 'helga') < middle('irmgard', 'bruno'));
    expect(x('heinz') < x('ilse')).toBe(middle('walter', 'frieda') < middle('ludwig', 'greta'));
  });

  it('draws one line per couple, starting at the couple', () => {
    expect(edges.filter((e) => e.target === 'paul')).toHaveLength(1);
    const toHeinz = edges.find((e) => e.target === 'heinz')!;
    expect(toHeinz.type).toBe('family');
    expect([...toHeinz.data!.parents].sort()).toEqual(['frieda', 'walter']);
  });

  it('offsets overlapping lines of different families between the same generations', () => {
    // Walter and Frieda come from different families of the same generation
    const levels = (a: string, b: string) => [edges.find((e) => e.target === a)!, edges.find((e) => e.target === b)!];
    const [r, e] = levels('walter', 'frieda');
    const span = (edge: Edge<FamilyEdgeData>) => {
      const originX = edge.data!.parents.reduce((sum, p) => sum + x(p), 0) / edge.data!.parents.length;
      return [Math.min(originX, x(edge.target)), Math.max(originX, x(edge.target))];
    };
    const [a, b] = [span(r), span(e)];
    const overlap = a[0] <= b[1] + 20 && a[1] >= b[0] - 20;
    if (overlap) {
      expect(r.data!.level).not.toBe(e.data!.level);
    }
  });

  it('starts at the single parent if only one is in view', () => {
    const single = familyEdges(layout, [{ id: 'x', source: 'greta', target: 'paul' }], partners);
    expect(single).toEqual([expect.objectContaining({ source: 'greta', target: 'paul', data: { parents: ['greta'], level: 0 } })]);
  });

  it('does not start between parents who are not side by side', () => {
    // Walter and Greta are not partners – each line starts at the respective parent
    const split = familyEdges(
      layout,
      [
        { id: 'a', source: 'walter', target: 'paul' },
        { id: 'b', source: 'greta', target: 'paul' },
      ],
      partners,
    );
    expect(split.map((e) => e.data!.parents)).toEqual([['walter'], ['greta']]);
  });
});

describe('partnerLine', () => {
  const box = (x: number, y: number) => ({ x, y, width: 220, height: 150 });

  it('runs from the right side of the left card to the left side of the right card', () => {
    const line = partnerLine(box(0, 0), box(280, 0));
    expect(line.from).toEqual({ x: 220, y: 75 });
    expect(line.to).toEqual({ x: 280, y: 75 });
    expect(line.middle).toEqual({ x: 250, y: 75 });
  });

  it('does not depend on the order of the arguments (a card dragged past its partner)', () => {
    expect(partnerLine(box(280, 0), box(0, 0))).toEqual(partnerLine(box(0, 0), box(280, 0)));
  });

  it('has its middle on the line if the partners are at different heights', () => {
    const { from, to, middle } = partnerLine(box(0, 0), box(500, 300));
    expect(middle).toEqual({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
    expect(middle.y).toBe(225);
  });
});

describe('familyPath', () => {
  const points = { originX: 100, originY: 50, busY: 200, targetX: 300, targetY: 260 };

  it('draws right-angled lines with the horizontal part at the bus height', () => {
    expect(familyPath('step', points)).toBe('M 100,50 V 200 H 300 V 260');
  });

  it('draws a straight line from the parents to the child', () => {
    expect(familyPath('straight', points)).toBe('M 100,50 L 300,260');
  });

  it('draws a curve that leaves and enters vertically', () => {
    expect(familyPath('curved', points)).toBe('M 100,50 C 100,155 300,155 300,260');
  });

  it('runs straight down through the gap below the parent cards before it curves or slants', () => {
    const couple = { ...points, dropY: 120 };
    expect(familyPath('curved', couple)).toBe('M 100,50 V 120 C 100,190 300,190 300,260');
    expect(familyPath('straight', couple)).toBe('M 100,50 V 120 L 300,260');
    expect(familyPath('step', couple)).toBe('M 100,50 V 200 H 300 V 260');
  });
});
