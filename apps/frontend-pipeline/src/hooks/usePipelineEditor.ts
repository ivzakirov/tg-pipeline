import { useState, useCallback } from 'react';
import { addEdge, useNodesState, useEdgesState } from '@xyflow/react';
import type { Connection, Node, Edge } from '@xyflow/react';
import type { Pipeline, Source } from '../types';
import * as pipelineService from '../services/pipelineService';
import { filterConfigToGraph } from '../utils/filterConfigToGraph';
import { graphToFilterConfig } from '../utils/graphToFilterConfig';

interface Options {
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
}

export function usePipelineEditor({ setPipelines }: Options) {
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [pipelineName, setPipelineName] = useState('New pipeline');
  const [saving, setSaving] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    { id: 'output', type: 'output', position: { x: 600, y: 150 }, data: {} },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges],
  );

  const load = useCallback((pipeline: Pipeline) => {
    setActivePipeline(pipeline);
    setPipelineName(pipeline.name);
    const pipelineSources = pipeline.pipelineSources ?? [];
    const srcNodes: Node[] = pipelineSources.map((ps, i) => ({
      id: `src-${ps.source.id}`,
      type: 'source' as const,
      position: { x: 50, y: 80 + i * 120 },
      data: { label: ps.source.name, telegramId: ps.source.telegramId, type: ps.source.type },
    }));
    const { filterNodes, filterEdges, outputX } = filterConfigToGraph(
      pipeline.filterConfig,
      srcNodes.map(n => n.id),
    );
    const outputNode: Node = { id: 'output', type: 'output' as const, position: { x: outputX, y: 150 }, data: {} };
    setNodes([...srcNodes, ...filterNodes, outputNode]);
    setEdges(filterEdges);
  }, [setNodes, setEdges]);

  const reset = useCallback(() => {
    setActivePipeline(null);
    setPipelineName('New pipeline');
    setNodes([{ id: 'output', type: 'output', position: { x: 600, y: 150 }, data: {} }]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const addFilterNode = useCallback((filterType: string) => {
    const id = `filter-${Date.now()}`;
    setNodes(nds => [...nds, {
      id, type: 'filter',
      position: { x: 300, y: 100 + nds.length * 80 },
      data: { filterType, value: '' },
    }]);
  }, [setNodes]);

  const addSourceNode = useCallback((source: Source) => {
    const id = `src-${source.id}`;
    setNodes(nds => {
      if (nds.find(n => n.id === id)) return nds;
      return [...nds, {
        id, type: 'source',
        position: { x: 50, y: 80 + nds.filter(n => n.type === 'source').length * 120 },
        data: { label: source.name, telegramId: source.telegramId, type: source.type },
      }];
    });
  }, [setNodes]);

  const removeSourceNode = useCallback((sourceId: string) => {
    const id = `src-${sourceId}`;
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const save = useCallback(async () => {
    setSaving(true);
    const { filterConfig, sourceNodeIds } = graphToFilterConfig(nodes, edges);
    const sourceIds = sourceNodeIds.map(id => id.replace('src-', ''));
    try {
      const payload = { name: pipelineName, filterConfig, sourceIds, enabled: true };
      if (activePipeline) {
        const data = await pipelineService.updatePipeline(activePipeline.id, payload);
        setPipelines(prev => prev.map(p => p.id === data.id ? data : p));
        setActivePipeline(data);
      } else {
        const data = await pipelineService.createPipeline(payload);
        setPipelines(prev => [...prev, data]);
        setActivePipeline(data);
      }
    } finally {
      setSaving(false);
    }
  }, [activePipeline, pipelineName, nodes, edges, setPipelines]);

  return {
    activePipeline,
    setActivePipeline,
    pipelineName,
    setPipelineName,
    saving,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    load,
    reset,
    addFilterNode,
    addSourceNode,
    removeSourceNode,
    save,
  };
}
