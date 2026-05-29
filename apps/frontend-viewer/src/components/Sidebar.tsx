import React from 'react';
import type { Pipeline } from '../types';
import type { SocketStatus } from '../hooks/useSocket';

interface Props {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  onSelect: (id: string) => void;
  status: SocketStatus;
}

const statusColor: Record<SocketStatus, string> = {
  connected:    'bg-[#4caf50]',
  connecting:   'bg-[#ff9800]',
  disconnected: 'bg-[#f44336]',
};

const statusLabel: Record<SocketStatus, string> = {
  connected:    'Connected',
  connecting:   'Connecting…',
  disconnected: 'Disconnected',
};

export default function Sidebar({ pipelines, activePipelineId, onSelect, status }: Props) {
  return (
    <div className="w-[260px] border-r border-tg-border dark:border-tg-border-dark bg-tg-surface dark:bg-tg-surface-dark flex flex-col overflow-y-auto flex-shrink-0">
      <div className="px-4 py-4 font-bold text-[13px] text-tg-text-sub dark:text-tg-text-sub-dark uppercase tracking-[0.5px]">
        Pipelines
      </div>

      {pipelines.map((p) => (
        <div
          key={p.id}
          className={`px-4 py-3 cursor-pointer text-sm flex items-center gap-2 rounded-md mx-2 my-0.5 text-tg-text dark:text-tg-text-dark ${
            p.id === activePipelineId
              ? 'bg-tg-active dark:bg-tg-active-dark'
              : 'hover:bg-tg-raised dark:hover:bg-tg-raised-dark'
          }`}
          onClick={() => onSelect(p.id)}
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${p.enabled ? 'bg-[#4caf50]' : 'bg-[#bbb]'}`}
          />
          {p.name}
        </div>
      ))}

      {pipelines.length === 0 && (
        <p className="px-4 text-[13px] text-tg-text-muted dark:text-tg-text-muted-dark text-center leading-relaxed">
          No pipelines yet.<br />Create one in Pipelines tab.
        </p>
      )}

      <div className="mt-auto px-4 py-3 border-t border-tg-border dark:border-tg-border-dark flex items-center gap-2 text-xs text-tg-text-muted dark:text-tg-text-muted-dark">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[status]}`} />
        {statusLabel[status]}
      </div>
    </div>
  );
}
