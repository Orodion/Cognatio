import dagre from 'dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type { LineStyle } from '@/lib/appearance';

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 240;
/** Distance between partners within a couple block */
export const PARTNER_GAP = 60;
/** Distance between the generations – room for the connecting lines of several families */
const RANK_GAP = 80;

/**
 * Groups persons connected by partner edges into blocks that should be placed next to each other.
 * The order follows the partner chain (e.g. first wife – husband – second wife).
 */
export function groupPartners(nodeIds: string[], partnerEdges: Edge[]): string[][] {
  const known = new Set(nodeIds);
  const adjacent = new Map<string, string[]>();
  for (const e of partnerEdges) {
    if (!known.has(e.source) || !known.has(e.target)) {
      continue;
    }
    adjacent.set(e.source, [...(adjacent.get(e.source) ?? []), e.target]);
    adjacent.set(e.target, [...(adjacent.get(e.target) ?? []), e.source]);
  }

  const assigned = new Set<string>();
  const blocks: string[][] = [];
  for (const id of nodeIds) {
    if (assigned.has(id)) {
      continue;
    }
    // Zusammenhangskomponente bestimmen
    const component: string[] = [];
    const stack = [id];
    const inComponent = new Set([id]);
    while (stack.length) {
      const current = stack.pop()!;
      component.push(current);
      for (const n of adjacent.get(current) ?? []) {
        if (!inComponent.has(n)) {
          inComponent.add(n);
          stack.push(n);
        }
      }
    }
    // For a chain start at one end and follow it
    const start = component.find((c) => (adjacent.get(c)?.length ?? 0) <= 1) ?? component[0];
    const ordered: string[] = [];
    const visit = (c: string) => {
      if (assigned.has(c)) {
        return;
      }
      assigned.add(c);
      ordered.push(c);
      for (const n of adjacent.get(c) ?? []) {
        visit(n);
      }
    };
    visit(start);
    blocks.push(ordered);
  }
  return blocks;
}

/**
 * Hierarchical layout (ancestors at the top): couples are laid out as one block so partners stand next to
 * each other and no other person gets between them. `layoutEdges` are the parent-child edges.
 */
export function layoutTree(nodes: Node[], layoutEdges: Edge[], partnerEdges: Edge[]): Node[] {
  const blocks = groupPartners(
    nodes.map((n) => n.id),
    partnerEdges,
  );
  const blockOf = new Map<string, number>();
  blocks.forEach((members, i) => members.forEach((id) => blockOf.set(id, i)));

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: RANK_GAP });
  blocks.forEach((members, i) => graph.setNode(String(i), { width: members.length * NODE_WIDTH + (members.length - 1) * PARTNER_GAP, height: NODE_HEIGHT }));
  for (const e of layoutEdges) {
    const from = blockOf.get(e.source);
    const to = blockOf.get(e.target);
    if (from === undefined || to === undefined || from === to) {
      continue;
    }
    graph.setEdge(String(from), String(to));
  }
  dagre.layout(graph);

  // Order within a couple block: each person on the side of their parents, otherwise the lines cross
  // (generation by generation from the top so the parents are already placed)
  const parentsOf = new Map<string, string[]>();
  for (const e of layoutEdges) {
    parentsOf.set(e.target, [...(parentsOf.get(e.target) ?? []), e.source]);
  }
  const center = new Map<string, number>();
  const place = (members: string[], blockIndex: number) => {
    const block = graph.node(String(blockIndex));
    members.forEach((id, i) => center.set(id, block.x - block.width / 2 + i * (NODE_WIDTH + PARTNER_GAP) + NODE_WIDTH / 2));
  };
  const byRank = blocks.map((_, i) => i).sort((a, b) => graph.node(String(a)).y - graph.node(String(b)).y);
  for (const i of byRank) {
    const members = blocks[i];
    place(members, i);
    if (members.length < 2) {
      continue;
    }
    const distance = () =>
      members.reduce((sum, id) => {
        const parents = (parentsOf.get(id) ?? []).filter((p) => center.has(p) && blockOf.get(p) !== i);
        if (!parents.length) {
          return sum;
        }
        const target = parents.reduce((acc, p) => acc + center.get(p)!, 0) / parents.length;
        return sum + Math.abs(center.get(id)! - target);
      }, 0);
    const before = distance();
    // Only mirror – this keeps the partner chain (first marriage – person – second marriage)
    members.reverse();
    place(members, i);
    if (distance() >= before) {
      members.reverse();
      place(members, i);
    }
  }

  return nodes.map((node) => {
    const blockIndex = blockOf.get(node.id)!;
    const block = graph.node(String(blockIndex));
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      // Dagre returns the centre of the block, React Flow expects the top-left corner of the node
      position: { x: center.get(node.id)! - NODE_WIDTH / 2, y: block.y - NODE_HEIGHT / 2 },
    };
  });
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Partner line between two cards: from the right side of the left card to the left side of the right card,
 * at the height of the card centres. Decided by the current positions so the line stays correct when a card is
 * dragged past its partner or to another height.
 */
export function partnerLine(a: Box, b: Box): { from: { x: number; y: number }; to: { x: number; y: number }; middle: { x: number; y: number } } {
  const [left, right] = a.x + a.width / 2 <= b.x + b.width / 2 ? [a, b] : [b, a];
  const from = { x: left.x + left.width, y: left.y + left.height / 2 };
  const to = { x: right.x, y: right.y + right.height / 2 };
  return { from, to, middle: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } };
}

/**
 * SVG path of a parent-child line in the chosen line style. From a couple the line starts between the cards;
 * with `dropY` (bottom edge of the parents) it first runs straight down through the gap, so the diagonal or
 * curved part starts below the cards and does not pass behind them.
 */
export function familyPath(style: LineStyle, p: { originX: number; originY: number; busY: number; targetX: number; targetY: number; dropY?: number }): string {
  const { originX, originY, busY, targetX, targetY } = p;
  const dropY = Math.min(Math.max(p.dropY ?? originY, originY), busY);
  const drop = dropY > originY ? ` V ${dropY}` : '';
  if (style === 'straight') {
    return `M ${originX},${originY}${drop} L ${targetX},${targetY}`;
  }
  if (style === 'curved') {
    const middle = (dropY + targetY) / 2;
    return `M ${originX},${originY}${drop} C ${originX},${middle} ${targetX},${middle} ${targetX},${targetY}`;
  }
  return `M ${originX},${originY} V ${busY} H ${targetX} V ${targetY}`;
}

/** Data of a family line (edge type `family`) */
export interface FamilyEdgeData extends Record<string, unknown> {
  /** One parent or a parent couple standing next to each other (the line then starts in the middle of the partner line) */
  parents: string[];
  /** Level of the horizontal line – families whose lines would otherwise overlap are offset */
  level: number;
}

/**
 * Parent-child lines in family tree style: per family one line from the parents (for a couple from the
 * middle of the partner line) vertically down, horizontally across all children and vertically to each child.
 * If the horizontal lines of different families overlap between the same generations, they get
 * different heights – otherwise it would not be clear which child belongs to which parents.
 */
export function familyEdges(nodes: Node[], layoutEdges: Edge[], partnerEdges: Edge[]): Array<Edge<FamilyEdgeData>> {
  const pos = new Map(nodes.map((n) => [n.id, n.position]));
  const partners = new Set(partnerEdges.map((e) => [e.source, e.target].sort().join('|')));
  const centerX = (id: string) => pos.get(id)!.x + NODE_WIDTH / 2;
  // The couple stands directly next to each other (otherwise the line would run through another person)
  const adjacent = (a: string, b: string) =>
    partners.has([a, b].sort().join('|')) &&
    pos.get(a)!.y === pos.get(b)!.y &&
    Math.abs(Math.abs(pos.get(a)!.x - pos.get(b)!.x) - (NODE_WIDTH + PARTNER_GAP)) < 1;

  const parentsOf = new Map<string, string[]>();
  for (const e of layoutEdges) {
    if (!pos.has(e.source) || !pos.has(e.target)) {
      continue;
    }
    const list = parentsOf.get(e.target) ?? [];
    if (!list.includes(e.source)) {
      parentsOf.set(e.target, [...list, e.source]);
    }
  }

  interface Family {
    parents: string[];
    originX: number;
    children: string[];
    childY: number;
    level: number;
  }
  const families = new Map<string, Family>();
  for (const [child, parents] of parentsOf) {
    const groups =
      parents.length === 2 && adjacent(parents[0], parents[1]) ? [[...parents].sort((a, b) => pos.get(a)!.x - pos.get(b)!.x)] : parents.map((p) => [p]);
    for (const group of groups) {
      const childY = pos.get(child)!.y;
      const key = `${group.join('+')}@${childY}`;
      let family = families.get(key);
      if (!family) {
        const originX = group.reduce((sum, p) => sum + centerX(p), 0) / group.length;
        family = { parents: group, originX, children: [], childY, level: 0 };
        families.set(key, family);
      }
      family.children.push(child);
    }
  }

  // Assign levels per generation gap: the same level only if the lines do not overlap
  const span = (f: Family) => {
    const xs = [f.originX, ...f.children.map(centerX)];
    return [Math.min(...xs), Math.max(...xs)] as const;
  };
  const byGap = new Map<number, Family[]>();
  for (const f of families.values()) {
    byGap.set(f.childY, [...(byGap.get(f.childY) ?? []), f]);
  }
  for (const group of byGap.values()) {
    const taken: Array<Array<readonly [number, number]>> = [];
    for (const f of group.sort((a, b) => span(a)[0] - span(b)[0])) {
      const [from, to] = span(f);
      let level = 0;
      while (taken[level]?.some(([a, b]) => from <= b + 20 && to >= a - 20)) {
        level++;
      }
      (taken[level] ??= []).push([from, to]);
      f.level = level;
    }
  }

  return [...families.values()].flatMap((f) =>
    f.children.map((child) => ({
      id: `family:${f.parents.join('+')}:${child}`,
      source: f.parents[0],
      target: child,
      type: 'family',
      data: { parents: f.parents, level: f.level },
    })),
  );
}

/** Network layout from left to right; all relations are taken into account. */
export function layoutNetwork(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 140 });
  nodes.forEach((node) => graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });
}
