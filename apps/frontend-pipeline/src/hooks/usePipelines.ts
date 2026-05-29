import { useState, useCallback } from 'react';
import type { Pipeline } from '../types';
import * as pipelineService from '../services/pipelineService';

export function usePipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    const data = await pipelineService.getPipelines();
    setPipelines(data);
  }, []);

  const startRename = useCallback((p: Pipeline, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(p.id);
    setRenameValue(p.name);
  }, []);

  const commitRename = useCallback(async (p: Pipeline): Promise<Pipeline | null> => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === p.name) return null;
    const updated = await pipelineService.updatePipeline(p.id, { name: trimmed });
    setPipelines(prev => prev.map(x => x.id === updated.id ? updated : x));
    return updated;
  }, [renameValue]);

  const remove = useCallback(async (p: Pipeline): Promise<boolean> => {
    if (!confirm(`Delete pipeline "${p.name}"?`)) return false;
    await pipelineService.deletePipeline(p.id);
    setPipelines(prev => prev.filter(x => x.id !== p.id));
    return true;
  }, []);

  return {
    pipelines,
    setPipelines,
    renamingId,
    setRenamingId,
    renameValue,
    setRenameValue,
    load,
    startRename,
    commitRename,
    remove,
  };
}
