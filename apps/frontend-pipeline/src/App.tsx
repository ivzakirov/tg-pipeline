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
  type Edge, // eslint-disable-line @typescript-eslint/no-unused-vars
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from './api';
import SourceNode from './nodes/SourceNode';
import FilterNode from './nodes/FilterNode';
import OutputNode from './nodes/OutputNode';
import { graphToFilterConfig } from './utils/graphToFilterConfig';
import { filterConfigToGraph } from './utils/filterConfigToGraph';
import type { Pipeline, Source } from './types';


const nodeTypes = { source: SourceNode, filter: FilterNode, output: OutputNode };

function useTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  useEffect(() => {
    const handler = () =>
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    window.addEventListener('theme-change', handler);
    return () => window.removeEventListener('theme-change', handler);
  }, []);
  return theme;
}

export default function App() {
  const theme = useTheme();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saving, setSaving] = useState(false);
  const [pipelineName, setPipelineName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showAddSource, setShowAddSource] = useState(false);
  const [srcForm, setSrcForm] = useState({ name: '', telegramId: '', telegramUsername: '', type: 'channel' as 'channel' | 'group' });
  const [srcError, setSrcError] = useState('');

  useEffect(() => {
    api.get('/api/pipelines').then(({ data }) => setPipelines(data));
    api.get('/api/sources').then(({ data }) => setSources(data));
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const loadPipeline = (pipeline: Pipeline) => {
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
      srcNodes.map((n) => n.id),
    );

    const outputNode: Node = {
      id: 'output',
      type: 'output' as const,
      position: { x: outputX, y: 150 },
      data: {},
    };

    setNodes([...srcNodes, ...filterNodes, outputNode]);
    setEdges(filterEdges);
  };

  const deleteSource = async (s: Source, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete source "${s.name}"?`)) return;
    await api.delete(`/api/sources/${s.id}`);
    setSources((prev) => prev.filter((x) => x.id !== s.id));
    setNodes((nds) => nds.filter((n) => n.id !== `src-${s.id}`));
    setEdges((eds) => eds.filter((e) => e.source !== `src-${s.id}` && e.target !== `src-${s.id}`));
  };

  const startRename = (p: Pipeline, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const commitRename = async (p: Pipeline) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === p.name) return;
    const { data } = await api.patch(`/api/pipelines/${p.id}`, { name: trimmed });
    setPipelines((prev) => prev.map((x) => (x.id === data.id ? data : x)));
    if (activePipeline?.id === p.id) {
      setActivePipeline(data);
      setPipelineName(data.name);
    }
  };

  const deletePipeline = async (p: Pipeline, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete pipeline "${p.name}"?`)) return;
    await api.delete(`/api/pipelines/${p.id}`);
    setPipelines((prev) => prev.filter((x) => x.id !== p.id));
    if (activePipeline?.id === p.id) newPipeline();
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

  const createSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSrcError('');
    const telegramId = parseInt(srcForm.telegramId, 10);
    if (isNaN(telegramId)) { setSrcError('Telegram ID must be a number'); return; }
    try {
      const { data } = await api.post('/api/sources', {
        name: srcForm.name,
        telegramId,
        telegramUsername: srcForm.telegramUsername || undefined,
        type: srcForm.type,
      });
      setSources((prev) => [...prev, data]);
      setSrcForm({ name: '', telegramId: '', telegramUsername: '', type: 'channel' });
      setShowAddSource(false);
    } catch (err: any) {
      setSrcError(err.response?.data?.message ?? 'Failed to create source');
    }
  };

  const savePipeline = async () => {
    setSaving(true);
    const { filterConfig, sourceNodeIds } = graphToFilterConfig(nodes, edges);
    const sourceIds = sourceNodeIds.map((id) => id.replace('src-', ''));

    try {
      const payload = { name: pipelineName, filterConfig, sourceIds, enabled: true };
      if (activePipeline) {
        const { data } = await api.patch(`/api/pipelines/${activePipeline.id}`, payload);
        setPipelines((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        setActivePipeline(data);
      } else {
        const { data } = await api.post('/api/pipelines', payload);
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
            style={{ ...styles.pipelineItem, background: activePipeline?.id === p.id ? 'var(--bg-active)' : 'transparent' }}
            onClick={() => renamingId !== p.id && loadPipeline(p)}
          >
            {renamingId === p.id ? (
              <input
                style={styles.renameInput}
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(p)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') commitRename(p);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                onDoubleClick={(e) => startRename(p, e)}
                title="Double-click to rename"
              >{p.name}</span>
            )}
            <button
              style={styles.btnDelete}
              title="Delete pipeline"
              onClick={(e) => deletePipeline(p, e)}
            >×</button>
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
          colorMode={theme}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Right: sources panel */}
      <div style={styles.sourcesPanel}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={styles.sidebarTitle}>Sources</span>
          <button style={styles.btnNew} onClick={() => { setShowAddSource((v) => !v); setSrcError(''); }}>
            {showAddSource ? '✕' : '+ Add'}
          </button>
        </div>
        {showAddSource && (
          <form onSubmit={createSource} style={styles.srcForm}>
            <input style={styles.srcInput} placeholder="Name" value={srcForm.name} onChange={(e) => setSrcForm((f) => ({ ...f, name: e.target.value }))} required />
            <input style={styles.srcInput} placeholder="Telegram ID (numeric)" value={srcForm.telegramId} onChange={(e) => setSrcForm((f) => ({ ...f, telegramId: e.target.value }))} required />
            <input style={styles.srcInput} placeholder="@username (optional)" value={srcForm.telegramUsername} onChange={(e) => setSrcForm((f) => ({ ...f, telegramUsername: e.target.value }))} />
            <select style={styles.srcInput} value={srcForm.type} onChange={(e) => setSrcForm((f) => ({ ...f, type: e.target.value as any }))}>
              <option value="channel">Channel</option>
              <option value="group">Group</option>
            </select>
            {srcError && <p style={styles.srcError}>{srcError}</p>}
            <button style={styles.btnSave} type="submit">Create</button>
          </form>
        )}
        {sources.map((s) => (
          <div key={s.id} style={styles.sourceItem} onClick={() => addSourceNode(s)} title="Click to add to canvas">
            <span>{s.type === 'channel' ? '📢' : '👥'}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            <button style={styles.btnDelete} title="Delete source" onClick={(e) => deleteSource(s, e)}>×</button>
          </div>
        ))}
        {sources.length === 0 && !showAddSource && <p style={styles.empty}>No sources yet.<br />Click "+ Add" to create one.</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', height: '100%' },
  sidebar: { width: '200px', borderRight: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border-light)' },
  sidebarTitle: { fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', flex: 1 },
  pipelineItem: { padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', margin: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)', padding: '0 2px', borderRadius: '3px', flexShrink: 0 },
  renameInput: { flex: 1, padding: '2px 4px', fontSize: '14px', border: '1px solid #2AABEE', borderRadius: '4px', outline: 'none', minWidth: 0, background: 'var(--bg-input)', color: 'var(--text-primary)' },
  btnNew: { padding: '4px 10px', borderRadius: '6px', background: '#2AABEE', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px' },
  canvas: { flex: 1, display: 'flex', flexDirection: 'column' },
  toolbar: { display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)', alignItems: 'center', flexWrap: 'wrap' },
  nameInput: { padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-input)', fontSize: '14px', width: '180px', background: 'var(--bg-input)', color: 'var(--text-primary)' },
  toolbarLabel: { fontSize: '12px', color: 'var(--text-secondary)' },
  btnFilter: { padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-input)', cursor: 'pointer', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' },
  btnSave: { marginLeft: 'auto', padding: '6px 16px', borderRadius: '6px', background: '#4caf50', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 },
  sourcesPanel: { width: '180px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-primary)', padding: '12px', overflow: 'auto' },
  sourceItem: { display: 'flex', gap: '6px', padding: '8px', cursor: 'pointer', fontSize: '13px', borderRadius: '6px', margin: '2px 0', color: 'var(--text-primary)' },
  empty: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' },
  srcForm: { display: 'flex', flexDirection: 'column' as const, gap: '6px', marginBottom: '10px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px' },
  srcInput: { padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-input)', fontSize: '12px', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)' },
  srcError: { color: '#e53935', fontSize: '11px', margin: 0 },
};
