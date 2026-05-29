import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';

export interface SourceNodeData {
  label: string;
  telegramId: number;
  type: 'channel' | 'group';
  [key: string]: unknown;
}

export default function SourceNode({ id, data }: NodeProps) {
  const d = data as SourceNodeData;
  const { deleteElements } = useReactFlow();
  return (
    <div className="flex gap-2 items-center px-3.5 py-2.5 bg-tg-active dark:bg-tg-active-dark border-2 border-tg-blue rounded-lg min-w-[160px]">
      <div className="text-xl">{d.type === 'channel' ? '📢' : '👥'}</div>
      <div className="flex-1">
        <div className="font-semibold text-[13px] text-tg-text dark:text-tg-text-dark">{d.label}</div>
        <div className="text-[11px] text-tg-text-sub dark:text-tg-text-sub-dark">@{d.telegramId}</div>
      </div>
      <button
        className="nodrag bg-transparent border-none cursor-pointer text-base leading-none text-[#bbb] p-0.5 rounded"
        onClick={() => deleteElements({ nodes: [{ id }] })}
        title="Remove from canvas"
      >×</button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
