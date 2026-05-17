import type { Node, Edge } from '@xyflow/react';
import type { FilterGroup, FilterCondition } from '../types';
import type { FilterNodeData } from '../nodes/FilterNode';
import type { SourceNodeData } from '../nodes/SourceNode';

export function graphToFilterConfig(
  nodes: Node[],
  edges: Edge[],
): { filterConfig: FilterGroup | null; sourceNodeIds: string[] } {
  const sourceNodes = nodes.filter((n) => n.type === 'source');
  const filterNodes = nodes.filter((n) => n.type === 'filter');
  const outputNode = nodes.find((n) => n.type === 'output');

  if (!outputNode) return { filterConfig: null, sourceNodeIds: [] };

  const sourceNodeIds = sourceNodes.map((n) => n.id);

  // Build adjacency: for each node, find what it connects to
  const childrenOf = (nodeId: string): string[] =>
    edges.filter((e) => e.source === nodeId).map((e) => e.target);

  // Find root filter nodes (connected from any source or directly to output)
  const rootFilterIds = filterNodes
    .filter((n) => {
      const incomers = edges.filter((e) => e.target === n.id).map((e) => e.source);
      return incomers.some((id) => sourceNodes.find((s) => s.id === id) || id === undefined);
    })
    .map((n) => n.id);

  if (rootFilterIds.length === 0 && filterNodes.length > 0) {
    rootFilterIds.push(...filterNodes.map((n) => n.id));
  }

  function buildNode(nodeId: string): FilterGroup | FilterCondition | null {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== 'filter') return null;

    const d = node.data as FilterNodeData;
    const children = childrenOf(nodeId);

    if (['AND', 'OR', 'NOT'].includes(d.filterType)) {
      const builtChildren = children.map(buildNode).filter(Boolean) as (FilterGroup | FilterCondition)[];
      return { operator: d.filterType as 'AND' | 'OR' | 'NOT', children: builtChildren };
    }

    return {
      type: d.filterType as FilterCondition['type'],
      value: d.value,
      negate: d.negate,
    };
  }

  if (rootFilterIds.length === 0) return { filterConfig: null, sourceNodeIds };

  const builtChildren = rootFilterIds.map(buildNode).filter(Boolean) as (FilterGroup | FilterCondition)[];
  const filterConfig: FilterGroup =
    builtChildren.length === 1 && 'operator' in builtChildren[0]
      ? (builtChildren[0] as FilterGroup)
      : { operator: 'AND', children: builtChildren };

  return { filterConfig, sourceNodeIds };
}
