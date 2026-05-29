import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './index.css';
import SourceNode from './nodes/SourceNode';
import FilterNode from './nodes/FilterNode';
import OutputNode from './nodes/OutputNode';
import PipelineList from './components/PipelineList';
import SourcePanel from './components/SourcePanel';
import { usePipelines } from './hooks/usePipelines';
import { useSources } from './hooks/useSources';
import { usePipelineEditor } from './hooks/usePipelineEditor';
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

  const {
    pipelines, setPipelines,
    renamingId, setRenamingId, renameValue, setRenameValue,
    load: loadPipelines, startRename, commitRename, remove: removePipeline,
  } = usePipelines();

  const {
    sources,
    showAddSource, setShowAddSource,
    srcForm, setSrcForm, srcError, setSrcError,
    load: loadSources, create: createSource, remove: removeSource,
  } = useSources();

  const {
    activePipeline, setActivePipeline,
    pipelineName, setPipelineName,
    saving, nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    load: loadPipeline, reset: newPipeline,
    addFilterNode, addSourceNode, removeSourceNode,
    save: savePipeline,
  } = usePipelineEditor({ setPipelines });

  useEffect(() => {
    loadPipelines();
    loadSources();
  }, []);

  const handleCommitRename = async (p: Pipeline) => {
    const updated = await commitRename(p);
    if (updated && activePipeline?.id === p.id) {
      setActivePipeline(updated);
      setPipelineName(updated.name);
    }
  };

  const handleDeletePipeline = async (p: Pipeline) => {
    const deleted = await removePipeline(p);
    if (deleted && activePipeline?.id === p.id) newPipeline();
  };

  const handleDeleteSource = async (s: Source) => {
    const deleted = await removeSource(s);
    if (deleted) removeSourceNode(s.id);
  };

  const inputClass = 'px-2.5 py-1.5 rounded-md border border-tg-border-input dark:border-tg-border-input-dark text-sm bg-tg-input dark:bg-tg-input-dark text-tg-text dark:text-tg-text-dark outline-none';

  return (
    <div className="flex h-full bg-tg-bg dark:bg-tg-bg-dark">
      <PipelineList
        pipelines={pipelines}
        activePipelineId={activePipeline?.id ?? null}
        renamingId={renamingId}
        renameValue={renameValue}
        onSelect={loadPipeline}
        onNew={newPipeline}
        onStartRename={startRename}
        onRenameChange={setRenameValue}
        onRenameCommit={handleCommitRename}
        onRenameCancel={() => setRenamingId(null)}
        onDelete={handleDeletePipeline}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-tg-border-light dark:border-tg-border-light-dark bg-tg-surface dark:bg-tg-surface-dark items-center flex-wrap">
          <input
            className={`${inputClass} w-[180px]`}
            value={pipelineName}
            onChange={e => setPipelineName(e.target.value)}
            placeholder="Pipeline name"
          />
          <span className="text-xs text-tg-text-sub dark:text-tg-text-sub-dark">Add filter:</span>
          {['keyword', 'regex', 'sender', 'has_media', 'AND', 'OR', 'NOT'].map(t => (
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
          >{saving ? 'Saving...' : 'Save'}</button>
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

      <SourcePanel
        sources={sources}
        showAddSource={showAddSource}
        srcForm={srcForm}
        srcError={srcError}
        onToggleAdd={() => { setShowAddSource(v => !v); setSrcError(''); }}
        onFormChange={patch => setSrcForm(f => ({ ...f, ...patch }))}
        onSubmit={createSource}
        onSourceClick={addSourceNode}
        onSourceDelete={handleDeleteSource}
      />
    </div>
  );
}
