import React from 'react';
import type { Source } from '../types';
import type { SourceFormState } from '../hooks/useSources';

interface Props {
  sources: Source[];
  showAddSource: boolean;
  srcForm: SourceFormState;
  srcError: string;
  onToggleAdd: () => void;
  onFormChange: (patch: Partial<SourceFormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSourceClick: (s: Source) => void;
  onSourceDelete: (s: Source) => void;
}

export default function SourcePanel({
  sources, showAddSource, srcForm, srcError,
  onToggleAdd, onFormChange, onSubmit, onSourceClick, onSourceDelete,
}: Props) {
  const inputClass = 'px-2.5 py-1.5 rounded-md border border-tg-border-input dark:border-tg-border-input-dark text-sm bg-tg-input dark:bg-tg-input-dark text-tg-text dark:text-tg-text-dark outline-none';

  return (
    <div className="w-[180px] border-l border-tg-border dark:border-tg-border-dark bg-tg-surface dark:bg-tg-surface-dark p-3 overflow-auto">
      <div className="flex items-center mb-2">
        <span className="font-bold text-[13px] text-tg-text-sub dark:text-tg-text-sub-dark uppercase flex-1">Sources</span>
        <button
          className="px-2.5 py-1 rounded-md bg-tg-blue text-white border-none cursor-pointer text-xs"
          onClick={onToggleAdd}
        >{showAddSource ? '✕' : '+ Add'}</button>
      </div>

      {showAddSource && (
        <form onSubmit={onSubmit} className="flex flex-col gap-1.5 mb-2.5 p-2 bg-tg-raised dark:bg-tg-raised-dark rounded-lg">
          <input className={inputClass} placeholder="Name" value={srcForm.name}
            onChange={e => onFormChange({ name: e.target.value })} required />
          <input className={inputClass} placeholder="Telegram ID (numeric)" value={srcForm.telegramId}
            onChange={e => onFormChange({ telegramId: e.target.value })} required />
          <input className={inputClass} placeholder="@username (optional)" value={srcForm.telegramUsername}
            onChange={e => onFormChange({ telegramUsername: e.target.value })} />
          <select className={inputClass} value={srcForm.type}
            onChange={e => onFormChange({ type: e.target.value as 'channel' | 'group' })}>
            <option value="channel">Channel</option>
            <option value="group">Group</option>
          </select>
          {srcError && <p className="text-[#e53935] text-[11px] m-0">{srcError}</p>}
          <button className="px-4 py-1.5 rounded-md bg-[#4caf50] text-white border-none cursor-pointer font-semibold text-sm" type="submit">
            Create
          </button>
        </form>
      )}

      {sources.map(s => (
        <div
          key={s.id}
          className="flex gap-1.5 p-2 cursor-pointer text-[13px] rounded-md my-0.5 text-tg-text dark:text-tg-text-dark hover:bg-tg-raised dark:hover:bg-tg-raised-dark"
          onClick={() => onSourceClick(s)}
          title="Click to add to canvas"
        >
          <span>{s.type === 'channel' ? '📢' : '👥'}</span>
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{s.name}</span>
          <button
            className="bg-transparent border-none cursor-pointer text-base leading-none text-tg-text-muted dark:text-tg-text-muted-dark p-0.5 rounded"
            title="Delete source"
            onClick={e => { e.stopPropagation(); onSourceDelete(s); }}
          >×</button>
        </div>
      ))}

      {sources.length === 0 && !showAddSource && (
        <p className="text-xs text-tg-text-muted dark:text-tg-text-muted-dark mt-2">
          No sources yet.<br />Click &ldquo;+ Add&rdquo; to create one.
        </p>
      )}
    </div>
  );
}
