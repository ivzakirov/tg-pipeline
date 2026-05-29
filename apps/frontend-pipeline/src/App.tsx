import React, { useCallback, useEffect, useState } from 'react';
import './index.css';
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
    const { filterNodes, filterEdges, outputX } = filterConfigToGraph(pipeline.filterConfig, srcNodes.map((n) => n.id));
    const outputNode: Node = { id: 'output', type: 'output' as const, position: { x: outputX, y: 150 }, data: {} };
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
    if (activePipeline?.id === p.id) { setActivePipeline(data); setPipelineName(data.name); }
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
    setNodes((nds) => [...nds, { id, type: 'filter', position: { x: 300, y: 100 + nds.length * 80 }, data: { filterType, value: '' } }]);
  };

  const addSourceNode = (source: Source) => {
    const id = `src-${source.id}`;
    if (nodes.find((n) => n.id === id)) return;
    setNodes((nds) => [...nds, {
      id, type: 'source',
      position: { x: 50, y: 80 + nds.filter((n) => n.type === 'source').length * 120 },
      data: { label: source.name, telegramId: source.telegramId, type: source.type },
    }]);
  };

  const createSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSrcError('');
    const telegramId = parseInt(srcForm.telegramId, 10);
    if (isNaN(telegramId)) { setSrcError('Telegram ID must be a number'); return; }
    try {
      const { data } = await api.post('/api/sources', {
        name: srcForm.name, telegramId,
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

  const sidebarItemBase = 'px-3.5 py-2.5 cursor-pointer text-sm rounded-md mx-1.5 my-0.5 flex items-center gap-1 text-tg-text dark:text-tg-text-dark';
  const inputClass = 'px-2.5 py-1.5 rounded-md border border-tg-border-input dark:border-tg-border-input-dark text-sm bg-tg-input dark:bg-tg-input-dark text-tg-text dark:text-tg-text-dark outline-none';

  return (
    <div className="flex h-full bg-tg-bg dark:bg-tg-bg-dark">
      {/* Pipeline list sidebar */}
      <div className="w-[200px] border-r border-tg-border dark:border-tg-border-dark bg-tg-surface dark:bg-tg-surface-dark flex flex-col">
        <div className="flex items-center px-3 py-3 border-b border-tg-border-light dark:border-tg-border-light-dark">
          <span className="font-bold text-[13px] text-tg-text-sub dark:text-tg-text-sub-dark uppercase flex-1">Pipelines</span>
          <button
            className="px-2.5 py-1 rounded-md bg-tg-blue text-white border-none cursor-pointer text-xs"
            onClick={newPipeline}
          >+ New</button>
        </div>
        {pipelines.map((p) => (
          <div
            key={p.id}
            className={`${sidebarItemBase} ${activePipeline?.id === p.id ? 'bg-tg-active dark:bg-tg-active-dark' : 'hover:bg-tg-raised dark:hover:bg-tg-raised-dark'}`}
            onClick={() => renamingId !== p.id && loadPipeline(p)}
          >
            {renamingId === p.id ? (
              <input
                className="flex-1 px-1 py-0.5 text-sm border border-tg-blue rounded outline-none min-w-0 bg-tg-input dark:bg-tg-input-dark text-tg-text dark:text-tg-text-dark"
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
                className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                onDoubleClick={(e) => startRename(p, e)}
                title="Double-click to rename"
              >{p.name}</span>
            )}
            <button
              className="bg-transparent border-none cursor-pointer text-base leading-none text-tg-text-muted dark:text-tg-text-muted-dark p-0.5 rounded flex-shrink-0"
              title="Delete pipeline"
              onClick={(e) => deletePipeline(p, e)}
            >×</button>
          </div>
        ))}
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-tg-border-light dark:border-tg-border-light-dark bg-tg-surface dark:bg-tg-surface-dark items-center flex-wrap">
          <input
            className={`${inputClass} w-[180px]`}
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="Pipeline name"
          />
          <span className="text-xs text-tg-text-sub dark:text-tg-text-sub-dark">Add filter:</span>
          {['keyword', 'regex', 'sender', 'has_media', 'AND', 'OR', 'NOT'].map((t) => (
            <button
              key={t}
              className="px-2.5 py-1 rounded-md border border-tg-border-input dark:border-tg-border-input-dark cursor-pointer text-xs bg-tg-raised dark:bg-tg-raised-dark text-tg-text dark:text-tg-text-dark"
              onClick={() => addFilterNode(t)}
            >{t}</button>
          ))}
          <button
            className="ml-auto px-4 py-1.5 rounded-md bg-[#4caf50] text-white border-none cursor-pointer font-semibold disabled:opacity-60"
            onClick={savePipeline}
            disabled={saving}
          >
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

      {/* Sources panel */}
      <div className="w-[180px] border-l border-tg-border dark:border-tg-border-dark bg-tg-surface dark:bg-tg-surface-dark p-3 overflow-auto">
        <div className="flex items-center mb-2">
          <span className="font-bold text-[13px] text-tg-text-sub dark:text-tg-text-sub-dark uppercase flex-1">Sources</span>
          <button
            className="px-2.5 py-1 rounded-md bg-tg-blue text-white border-none cursor-pointer text-xs"
            onClick={() => { setShowAddSource((v) => !v); setSrcError(''); }}
          >
            {showAddSource ? '✕' : '+ Add'}
          </button>
        </div>

        {showAddSource && (
          <form onSubmit={createSource} className="flex flex-col gap-1.5 mb-2.5 p-2 bg-tg-raised dark:bg-tg-raised-dark rounded-lg">
            <input className={inputClass} placeholder="Name" value={srcForm.name} onChange={(e) => setSrcForm((f) => ({ ...f, name: e.target.value }))} required />
            <input className={inputClass} placeholder="Telegram ID (numeric)" value={srcForm.telegramId} onChange={(e) => setSrcForm((f) => ({ ...f, telegramId: e.target.value }))} required />
            <input className={inputClass} placeholder="@username (optional)" value={srcForm.telegramUsername} onChange={(e) => setSrcForm((f) => ({ ...f, telegramUsername: e.target.value }))} />
            <select className={inputClass} value={srcForm.type} onChange={(e) => setSrcForm((f) => ({ ...f, type: e.target.value as any }))}>
              <option value="channel">Channel</option>
              <option value="group">Group</option>
            </select>
            {srcError && <p className="text-[#e53935] text-[11px] m-0">{srcError}</p>}
            <button className="px-4 py-1.5 rounded-md bg-[#4caf50] text-white border-none cursor-pointer font-semibold text-sm" type="submit">Create</button>
          </form>
        )}

        {sources.map((s) => (
          <div
            key={s.id}
            className="flex gap-1.5 p-2 cursor-pointer text-[13px] rounded-md my-0.5 text-tg-text dark:text-tg-text-dark hover:bg-tg-raised dark:hover:bg-tg-raised-dark"
            onClick={() => addSourceNode(s)}
            title="Click to add to canvas"
          >
            <span>{s.type === 'channel' ? '📢' : '👥'}</span>
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{s.name}</span>
            <button
              className="bg-transparent border-none cursor-pointer text-base leading-none text-tg-text-muted dark:text-tg-text-muted-dark p-0.5 rounded"
              title="Delete source"
              onClick={(e) => deleteSource(s, e)}
            >×</button>
          </div>
        ))}
        {sources.length === 0 && !showAddSource && (
          <p className="text-xs text-tg-text-muted dark:text-tg-text-muted-dark mt-2">No sources yet.<br />Click "+ Add" to create one.</p>
        )}
      </div>
    </div>
  );
}
