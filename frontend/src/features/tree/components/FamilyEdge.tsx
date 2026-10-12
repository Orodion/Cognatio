import { BaseEdge, useInternalNode, type Edge, type EdgeProps, type InternalNode } from '@xyflow/react';
import { familyPath, partnerLine, type Box, type FamilyEdgeData } from '@/features/tree/lib/treeLayout';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { PARTNER_DASH } from '@/lib/appearance';

/** Distance of the lowest horizontal line above the child and offset per level */
const BUS_MARGIN = 24;
const BUS_STEP = 16;

/** Live position and size of a card (from React Flow, also while it is being dragged) */
const boxOf = (node: InternalNode): Box => ({
  x: node.internals.positionAbsolute.x,
  y: node.internals.positionAbsolute.y,
  width: node.measured.width ?? 0,
  height: node.measured.height ?? 0,
});

/**
 * Partner line: straight between the facing sides of the two cards, whatever their current positions.
 */
export function PartnerEdge({ id, source, target, style }: EdgeProps) {
  const a = useInternalNode(source);
  const b = useInternalNode(target);
  const { partnerLine: kind, lineWidth, lineColor } = useAppearanceStore();
  if (!a || !b) {
    return null;
  }
  const { from, to } = partnerLine(boxOf(a), boxOf(b));
  const lineStyle = {
    ...style,
    strokeWidth: lineWidth,
    strokeDasharray: PARTNER_DASH[kind],
    strokeLinecap: kind === 'dotted' ? ('round' as const) : undefined,
    ...(lineColor === 'accent' ? { stroke: 'hsl(var(--primary))' } : {}),
  };
  return <BaseEdge id={id} path={`M ${from.x},${from.y} L ${to.x},${to.y}`} style={lineStyle} />;
}

/**
 * Parent-child line: from the parents vertically down, horizontally to the child, vertically into it.
 * For a parent couple it starts in the middle of the partner line. The positions come live from
 * React Flow so the line stays correct after a person is moved.
 */
export function FamilyEdge({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd }: EdgeProps<Edge<FamilyEdgeData>>) {
  const parents = data?.parents ?? [];
  const first = useInternalNode(parents[0] ?? '');
  const second = useInternalNode(parents[1] ?? parents[0] ?? '');
  const { lineStyle, lineWidth, lineColor } = useAppearanceStore();

  let originX = sourceX;
  let originY = sourceY;
  let parentsBottom = sourceY;
  if (parents.length === 2 && first && second && first !== second) {
    const a = boxOf(first);
    const b = boxOf(second);
    // Starts on the partner line itself, even if the partners are at different heights
    ({ x: originX, y: originY } = partnerLine(a, b).middle);
    parentsBottom = Math.max(a.y + a.height, b.y + b.height);
  }

  // Horizontal line above the child, higher per level – but never above the bottom edge of the parents
  const busY = Math.max(targetY - BUS_MARGIN - (data?.level ?? 0) * BUS_STEP, parentsBottom + 8);
  const path = familyPath(lineStyle, { originX, originY, busY, targetX, targetY, dropY: parentsBottom });
  const edgeStyle = { ...style, strokeWidth: lineWidth, ...(lineColor === 'accent' ? { stroke: 'hsl(var(--primary))' } : {}) };

  return <BaseEdge id={id} path={path} style={edgeStyle} markerEnd={markerEnd} />;
}
