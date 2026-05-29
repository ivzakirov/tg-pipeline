import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';

export interface FilterNodeData {
  filterType: 'keyword' | 'regex' | 'sender' | 'has_media' | 'media_type' | 'AND' | 'OR' | 'NOT';
  value?: string;
  negate?: boolean;
  label?: string;
  [key: string]: unknown;
}

const FILTER_TYPE_CONFIG: Record<string, { label: string; placeholder?: string; hasValue?: true; isLogic?: true }> = {
  keyword:    { label: '🔤 Keyword',    placeholder: 'e.g. bitcoin',              hasValue: true },
  regex:      { label: '🔣 Regex',      placeholder: 'e.g. \\d{4}',              hasValue: true },
  sender:     { label: '👤 Sender',     placeholder: 'sender name or ID',          hasValue: true },
  has_media:  { label: '📎 Has Media' },
  media_type: { label: '🖼 Media Type', placeholder: 'photo / video / document',  hasValue: true },
  AND:        { label: '⋀ AND',         isLogic: true },
  OR:         { label: '⋁ OR',          isLogic: true },
  NOT:        { label: '¬ NOT',         isLogic: true },
};

export default function FilterNode({ id, data }: NodeProps) {
  const d = data as FilterNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const cfg = FILTER_TYPE_CONFIG[d.filterType] ?? { label: d.filterType };
  const isLogic  = !!cfg.isLogic;
  const hasValue = !!cfg.hasValue;

  const borderColor = isLogic ? '#ff9800' : '#4caf50';

  return (
    <div
      className="px-2.5 py-2 bg-white dark:bg-tg-raised-dark border-2 rounded-lg min-w-[160px] flex flex-col gap-[5px]"
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Left} />

      <div className="flex items-center justify-between gap-1">
        <div className="font-semibold text-[13px] flex-1 text-tg-text dark:text-tg-text-dark">
          {cfg.label}
        </div>
        <button
          className="nodrag bg-transparent border-none cursor-pointer text-base leading-none text-[#bbb] p-0.5 rounded"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          title="Delete node"
        >×</button>
      </div>

      {hasValue && (
        <input
          className="nodrag text-[11px] px-1.5 py-1 rounded border border-tg-border-input dark:border-tg-border-input-dark outline-none w-full bg-tg-input dark:bg-tg-input-dark text-tg-text dark:text-tg-text-dark box-border"
          placeholder={cfg.placeholder ?? 'value'}
          value={d.label ?? d.value ?? ''}
          onChange={(e) => updateNodeData(id, { value: e.target.value, label: undefined })}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}

      {!isLogic && (
        <label className="nodrag flex items-center gap-1 text-[11px] text-tg-text-sub dark:text-tg-text-sub-dark cursor-pointer">
          <input
            type="checkbox"
            checked={!!d.negate}
            onChange={(e) => updateNodeData(id, { negate: e.target.checked })}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <span>Negate</span>
        </label>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
