import { useEffect, type RefObject } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { ReactFlow, Controls, Background, BackgroundVariant, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import { PersonNode } from './PersonNode';
import { FamilyEdge, PartnerEdge } from './FamilyEdge';
import type { Person } from '@/features/persons/types/person';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { buildEdges, buildNetworkEdges, type TreeRelation, type TreeView } from '@/features/tree/lib/treeUtils';
import { familyEdges, layoutNetwork, layoutTree } from '@/features/tree/lib/treeLayout';

// Wir definieren unsere Custom Nodes
const nodeTypes = {
  person: PersonNode,
};
const edgeTypes = {
  family: FamilyEdge,
  partner: PartnerEdge,
};

interface FamilyTreeProps {
  persons: Person[];
  relations: TreeRelation[];
  view: TreeView;
  focusId: string | null;
  /** Persons to show (selected by view and depth) */
  visibleIds: Set<string>;
  /** Makes a person the focus person; without it the cards have no focus button */
  onFocus?: (personId: string) => void;
  /** Starting point: the focus person at normal size (default) or the whole graph */
  fit?: 'focus' | 'all';
  /** Outer container – the export reads the rendered graph from it */
  containerRef?: RefObject<HTMLDivElement>;
}

export function FamilyTree({ persons, relations, view, focusId, visibleIds, onFocus, fit = 'focus', containerRef }: FamilyTreeProps) {
  const { t } = useTranslation();
  const background = useAppearanceStore((s) => s.treeBackground);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const initialNodes: Node[] = persons
      .filter((person) => visibleIds.has(person.id))
      .map((person) => ({
        id: person.id,
        type: 'person',
        data: { person, isFocus: person.id === focusId, onFocus },
        position: { x: 0, y: 0 },
      }));

    if (view === 'network') {
      const networkEdges = buildNetworkEdges(relations, visibleIds, (rel) => rel.label || t(`relations.types.${rel.type}`, { defaultValue: rel.type }));
      setNodes(layoutNetwork(initialNodes, networkEdges));
      setEdges(networkEdges);
    } else {
      const { edges: treeEdges, layoutEdges } = buildEdges(relations, visibleIds);
      const partnerEdges = treeEdges.filter((e) => !layoutEdges.includes(e));
      const layouted = layoutTree(initialNodes, layoutEdges, partnerEdges);
      // Always draw the partner line from the left to the right partner (right handle → left handle)
      const x = new Map(layouted.map((n) => [n.id, n.position.x]));
      setNodes(layouted);
      setEdges([
        ...partnerEdges.map((e) => (x.get(e.source)! > x.get(e.target)! ? { ...e, source: e.target, target: e.source } : e)),
        // Eltern-Kind-Linien je Familie statt je Elternteil
        ...familyEdges(layouted, layoutEdges, partnerEdges),
      ]);
    }
  }, [persons, relations, visibleIds, view, focusId, onFocus, setNodes, setEdges, t]);

  return (
    <div ref={containerRef} className="min-h-[300px] w-full flex-1 rounded-xl border bg-card shadow-xs" data-testid="family-tree">
      <ReactFlow
        // Remount when the view, the focus person or the set of persons changes so the view is re-aligned
        key={`${view}:${focusId}:${nodes.map((n) => n.id).join(',')}`}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesConnectable={false}
        // Keyboard: Tab reaches the name link and focus button in the node directly instead of additionally every node/edge
        nodesFocusable={false}
        edgesFocusable={false}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        // With a focus person it is the starting point: centred at normal size instead of the whole graph
        fitViewOptions={
          fit === 'all'
            ? { maxZoom: 1, padding: 0.15 }
            : focusId && nodes.some((n) => n.id === focusId)
              ? { nodes: [{ id: focusId }], maxZoom: 1, minZoom: 1 }
              : undefined
        }
        minZoom={0.1}
        // The "React Flow" mark in the corner is left out (the MIT licence does not require it); the library is named in README.md and THIRD-PARTY-NOTICES.md
        proOptions={{ hideAttribution: true }}
      >
        {background === 'dots' && <Background variant={BackgroundVariant.Dots} color="#ccc" gap={16} />}
        {background === 'grid' && <Background variant={BackgroundVariant.Lines} color="rgba(128, 128, 128, 0.25)" gap={40} />}
        <Controls />
      </ReactFlow>
    </div>
  );
}
