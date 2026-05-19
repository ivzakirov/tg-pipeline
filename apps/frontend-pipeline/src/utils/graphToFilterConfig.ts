import type { Node, Edge } from '@xyflow/react';
import type { FilterGroup, FilterCondition } from '../types';
import type { FilterNodeData } from '../nodes/FilterNode';

export function graphToFilterConfig(
  nodes: Node[],
  edges: Edge[],
): { filterConfig: FilterGroup | FilterCondition | null; sourceNodeIds: string[] } {
  const sourceNodes = nodes.filter((n) => n.type === 'source');
  const filterNodes = nodes.filter((n) => n.type === 'filter');

  const sourceNodeIds = sourceNodes.map((n) => n.id);

  // Root = filter node that has an outgoing edge to 'output'
  const rootFilter = filterNodes.find((n) =>
    edges.some((e) => e.source === n.id && e.target === 'output'),
  );

  if (!rootFilter) return { filterConfig: null, sourceNodeIds };

  const filterNodeIds = new Set(filterNodes.map((n) => n.id));

  const childrenOf = (nodeId: string): string[] =>
    edges
      .filter((e) => e.source === nodeId && filterNodeIds.has(e.target))
      .map((e) => e.target);

  function buildNode(nodeId: string): FilterGroup | FilterCondition | null {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== 'filter') return null;

    const d = node.data as FilterNodeData;
    const children = childrenOf(nodeId);

    if (['AND', 'OR', 'NOT'].includes(d.filterType)) {
      const builtChildren = children
        .map(buildNode)
        .filter(Boolean) as (FilterGroup | FilterCondition)[];
      return { operator: d.filterType as 'AND' | 'OR' | 'NOT', children: builtChildren };
    }

    return {
      type: d.filterType as FilterCondition['type'],
      value: d.value,
      negate: d.negate,
    };
  }

  const built = buildNode(rootFilter.id);
  return { filterConfig: built, sourceNodeIds };
}
