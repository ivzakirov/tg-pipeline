import React from 'react';
import type { Pipeline } from '../types';

interface Props {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  renamingId: string | null;
  renameValue: string;
  onSelect: (p: Pipeline) => void;
  onNew: () => void;
  onStartRename: (p: Pipeline, e: React.MouseEvent) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: (p: Pipeline) => void;
  onRenameCancel: () => void;
  onDelete: (p: Pipeline) => void;
}

export default function PipelineList({
  pipelines, activePipelineId,
  renamingId, renameValue,
  onSelect, onNew,
  onStartRename, onRenameChange, onRenameCommit, onRenameCancel,
  onDelete,
}: Props) {
  const itemBase = 'px-3.5 py-2.5 cursor-pointer text-sm rounded-md mx-1.5 my-0.5 flex items-center gap-1 text-tg-text dark:text-tg-text-dark';

  return (
    <div className="w-[200px] border-r border-tg-border dark:border-tg-border-dark bg-tg-surface dark:bg-tg-surface-dark flex flex-col">
      <div className="flex items-center px-3 py-3 border-b border-tg-border-light dark:border-tg-border-light-dark">
        <span className="font-bold text-[13px] text-tg-text-sub dark:text-tg-text-sub-dark uppercase flex-1">Pipelines</span>
        <button
          className="px-2.5 py-1 rounded-md bg-tg-blue text-white border-none cursor-pointer text-xs"
          onClick={onNew}
        >+ New</button>
      </div>

      {pipelines.map(p => (
        <div
          key={p.id}
          className={`${itemBase} ${activePipelineId === p.id ? 'bg-tg-active dark:bg-tg-active-dark' : 'hover:bg-tg-raised dark:hover:bg-tg-raised-dark'}`}
          onClick={() => renamingId !== p.id && onSelect(p)}
        >
          {renamingId === p.id ? (
            <input
              className="flex-1 px-1 py-0.5 text-sm border border-tg-blue rounded outline-none min-w-0 bg-tg-input dark:bg-tg-input-dark text-tg-text dark:text-tg-text-dark"
              value={renameValue}
              autoFocus
              onChange={e => onRenameChange(e.target.value)}
              onBlur={() => onRenameCommit(p)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') onRenameCommit(p);
                if (e.key === 'Escape') onRenameCancel();
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              onDoubleClick={e => onStartRename(p, e)}
              title="Double-click to rename"
            >{p.name}</span>
          )}
          <button
            className="bg-transparent border-none cursor-pointer text-base leading-none text-tg-text-muted dark:text-tg-text-muted-dark p-0.5 rounded flex-shrink-0"
            title="Delete pipeline"
            onClick={e => { e.stopPropagation(); onDelete(p); }}
          >×</button>
        </div>
      ))}
    </div>
  );
}
