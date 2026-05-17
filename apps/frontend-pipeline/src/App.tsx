import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import SourceNode from './nodes/SourceNode';
import FilterNode from './nodes/FilterNode';
import OutputNode from './nodes/OutputNode';
import { graphToFilterConfig } from './utils/graphToFilterConfig';
import type { Pipeline, Source } from './types';

function getToken(): string | null {
  return (window as any).__TG_ACCESS_TOKEN__ ?? null;
}

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const nodeTypes = { source: SourceNode, filter: FilterNode, output: OutputNode };

export default function App() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saving, setSaving] = useState(false);
  const [pipelineName, setPipelineName] = useState('');

  useEffect(() => {
    axios.get('/api/pipelines', { headers: authHeaders() }).then(({ data }) => setPipelines(data));
    axios.get('/api/sources', { headers: authHeaders() }).then(({ data }) => setSources(data));
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const loadPipeline = (pipeline: Pipeline) => {
    setActivePipeline(pipeline);
    setPipelineName(pipeline.name);

    // Build nodes from pipeline data (simplified representation)
    const pipelineSources = pipeline.pipelineSources ?? [];
    const srcNodes = pipelineSources.map((ps, i) => ({
      id: `src-${ps.source.id}`,
      type: 'source' as const,
      position: { x: 50, y: 80 + i * 120 },
      data: { label: ps.source.name, telegramId: ps.source.telegramId, type: ps.source.type },
    }));

    const outputNode = {
      id: 'output',
      type: 'output' as const,
      position: { x: 600, y: 150 },
      data: {},
    };

    setNodes([...srcNodes, outputNode]);
    setEdges([]);
  };

  const newPipeline = () => {
    setActivePipeline(null);
    setPipelineName('New pipeline');
    setNodes([{ id: 'output', type: 'output', position: { x: 600, y: 150 }, data: {} }]);
    setEdges([]);
  };

  const addFilterNode = (filterType: string) => {
    const id = `filter-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'filter',
        position: { x: 300, y: 100 + nds.length * 80 },
        data: { filterType, value: '' },
      },
    ]);
  };

  const addSourceNode = (source: Source) => {
    const id = `src-${source.id}`;
    if (nodes.find((n) => n.id === id)) return;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'source',
        position: { x: 50, y: 80 + nds.filter((n) => n.type === 'source').length * 120 },
        data: { label: source.name, telegramId: source.telegramId, type: source.type },
      },
    ]);
  };

  const savePipeline = async () => {
    setSaving(true);
    const { filterConfig, sourceNodeIds } = graphToFilterConfig(nodes, edges);
    const sourceIds = sourceNodeIds.map((id) => id.replace('src-', ''));

    try {
      const payload = { name: pipelineName, filterConfig, sourceIds, enabled: true };
      if (activePipeline) {
        const { data } = await axios.patch(`/api/pipelines/${activePipeline.id}`, payload, { headers: authHeaders() });
        setPipelines((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        setActivePipeline(data);
      } else {
        const { data } = await axios.post('/api/pipelines', payload, { headers: authHeaders() });
        setPipelines((prev) => [...prev, data]);
        setActivePipeline(data);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Left: pipeline list */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarTitle}>Pipelines</span>
          <button style={styles.btnNew} onClick={newPipeline}>+ New</button>
        </div>
        {pipelines.map((p) => (
          <div
            key={p.id}
            style={{ ...styles.pipelineItem, background: activePipeline?.id === p.id ? '#e8f4fd' : 'transparent' }}
            onClick={() => loadPipeline(p)}
          >
            {p.name}
          </div>
        ))}
      </div>

      {/* Center: React Flow canvas */}
      <div style={styles.canvas}>
        <div style={styles.toolbar}>
          <input
            style={styles.nameInput}
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="Pipeline name"
          />
          <span style={styles.toolbarLabel}>Add filter:</span>
          {['keyword', 'regex', 'sender', 'has_media', 'AND', 'OR', 'NOT'].map((t) => (
            <button key={t} style={styles.btnFilter} onClick={() => addFilterNode(t)}>{t}</button>
          ))}
          <button style={styles.btnSave} onClick={savePipeline} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Right: sources panel */}
      <div style={styles.sourcesPanel}>
        <div style={styles.sidebarTitle}>Sources</div>
        {sources.map((s) => (
          <div key={s.id} style={styles.sourceItem} onClick={() => addSourceNode(s)}>
            <span>{s.type === 'channel' ? '📢' : '👥'}</span>
            <span>{s.name}</span>
          </div>
        ))}
        {sources.length === 0 && <p style={styles.empty}>No sources yet</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', height: '100%' },
  sidebar: { width: '200px', borderRight: '1px solid #e5e5e5', background: '#fff', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #eee' },
  sidebarTitle: { fontWeight: 700, fontSize: '13px', color: '#888', textTransform: 'uppercase', flex: 1 },
  pipelineItem: { padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', margin: '2px 6px' },
  btnNew: { padding: '4px 10px', borderRadius: '6px', background: '#2AABEE', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px' },
  canvas: { flex: 1, display: 'flex', flexDirection: 'column' },
  toolbar: { display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #eee', background: '#fff', alignItems: 'center', flexWrap: 'wrap' },
  nameInput: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '180px' },
  toolbarLabel: { fontSize: '12px', color: '#888' },
  btnFilter: { padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', fontSize: '12px', background: '#fafafa' },
  btnSave: { marginLeft: 'auto', padding: '6px 16px', borderRadius: '6px', background: '#4caf50', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 },
  sourcesPanel: { width: '180px', borderLeft: '1px solid #e5e5e5', background: '#fff', padding: '12px', overflow: 'auto' },
  sourceItem: { display: 'flex', gap: '6px', padding: '8px', cursor: 'pointer', fontSize: '13px', borderRadius: '6px', margin: '2px 0' },
  empty: { fontSize: '12px', color: '#aaa', marginTop: '8px' },
};
