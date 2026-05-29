import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function OutputNode({ data }: NodeProps) {
  return (
    <div className="px-3.5 py-2.5 bg-[#e8f5e9] dark:bg-[#1a3a2a] border-2 border-[#4caf50] rounded-lg min-w-[140px]">
      <Handle type="target" position={Position.Left} />
      <div>
        <div className="font-semibold text-[13px] text-tg-text dark:text-tg-text-dark">✅ Output</div>
        <div className="text-[11px] text-tg-text-sub dark:text-tg-text-sub-dark mt-0.5">pipeline.filtered</div>
      </div>
    </div>
  );
}
