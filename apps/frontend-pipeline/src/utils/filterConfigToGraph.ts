import type { Node, Edge } from '@xyflow/react';
import type { FilterGroup, FilterCondition } from '../types';

const X_ROOT = 280;
const X_STEP = 220;
const LEAF_HEIGHT = 90;
const Y_GAP = 20;

let seq = 0;
const uid = () => `fr${++seq}-${Date.now()}`;

interface LayoutResult {
  nodeId: string;
  centerY: number;
  totalHeight: number;
}

export function filterConfigToGraph(
  filterConfig: FilterGroup | FilterCondition | null,
  sourceNodeIds: string[],
): { filterNodes: Node[]; filterEdges: Edge[]; outputX: number } {
  const filterNodes: Node[] = [];
  const filterEdges: Edge[] = [];

  if (!filterConfig) {
    const directEdges: Edge[] = sourceNodeIds.map((srcId) => ({
      id: `e-${srcId}-output`,
      source: srcId,
      target: 'output',
    }));
    return { filterNodes: [], filterEdges: directEdges, outputX: 700 };
  }

  function layout(
    config: FilterGroup | FilterCondition,
    depth: number,
    yStart: number,
  ): LayoutResult {
    const nodeId = uid();
    const x = X_ROOT + depth * X_STEP;

    if ('operator' in config) {
      if (config.children.length === 0) {
        filterNodes.push({ id: nodeId, type: 'filter', position: { x, y: yStart }, data: { filterType: config.operator } });
        return { nodeId, centerY: yStart + 35, totalHeight: LEAF_HEIGHT };
      }

      let y = yStart;
      const childResults: LayoutResult[] = [];

      for (const child of config.children) {
        const r = layout(child, depth + 1, y);
        childResults.push(r);
        filterEdges.push({ id: `e-${nodeId}-${r.nodeId}`, source: nodeId, target: r.nodeId });
        y += r.totalHeight + Y_GAP;
      }

      const totalHeight = y - yStart - Y_GAP;
      const centerY = (childResults[0].centerY + childResults[childResults.length - 1].centerY) / 2;

      filterNodes.push({ id: nodeId, type: 'filter', position: { x, y: centerY - 30 }, data: { filterType: config.operator } });
      return { nodeId, centerY, totalHeight };
    } else {
      filterNodes.push({
        id: nodeId,
        type: 'filter',
        position: { x, y: yStart },
        data: {
          filterType: config.type,
          value: Array.isArray(config.value) ? config.value.join(', ') : (config.value ?? ''),
          negate: config.negate ?? false,
          label: config.label,
        },
      });
      return { nodeId, centerY: yStart + LEAF_HEIGHT / 2, totalHeight: LEAF_HEIGHT };
    }
  }

  const { nodeId: rootId } = layout(filterConfig, 0, 80);

  for (const srcId of sourceNodeIds) {
    filterEdges.push({ id: `e-${srcId}-${rootId}`, source: srcId, target: rootId });
  }
  filterEdges.push({ id: `e-${rootId}-output`, source: rootId, target: 'output' });

  const maxDepth = Math.max(...filterNodes.map((n) => Math.round((n.position.x - X_ROOT) / X_STEP)));
  const outputX = X_ROOT + (maxDepth + 1) * X_STEP + 80;

  return { filterNodes, filterEdges, outputX };
}
