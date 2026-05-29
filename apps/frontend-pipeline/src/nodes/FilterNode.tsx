import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';

export interface FilterNodeData {
  filterType: 'keyword' | 'regex' | 'sender' | 'has_media' | 'media_type' | 'AND' | 'OR' | 'NOT';
  value?: string;
  negate?: boolean;
  label?: string;
  [key: string]: unknown;
}

const TYPE_LABELS: Record<string, string> = {
  keyword:   '🔤 Keyword',
  regex:     '🔣 Regex',
  sender:    '👤 Sender',
  has_media: '📎 Has Media',
  media_type:'🖼 Media Type',
  AND:       '⋀ AND',
  OR:        '⋁ OR',
  NOT:       '¬ NOT',
};

const VALUE_PLACEHOLDER: Record<string, string> = {
  keyword:    'e.g. bitcoin',
  regex:      'e.g. \\d{4}',
  sender:     'sender name or ID',
  media_type: 'photo / video / document',
};

const HAS_VALUE = ['keyword', 'regex', 'sender', 'media_type'];
const IS_LOGIC  = ['AND', 'OR', 'NOT'];

export default function FilterNode({ id, data }: NodeProps) {
  const d = data as FilterNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const isLogic  = IS_LOGIC.includes(d.filterType);
  const hasValue = HAS_VALUE.includes(d.filterType);

  const borderColor = isLogic ? '#ff9800' : '#4caf50';

  return (
    <div
      className="px-2.5 py-2 bg-white dark:bg-tg-raised-dark border-2 rounded-lg min-w-[160px] flex flex-col gap-[5px]"
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Left} />

      <div className="flex items-center justify-between gap-1">
        <div className="font-semibold text-[13px] flex-1 text-tg-text dark:text-tg-text-dark">
          {TYPE_LABELS[d.filterType] ?? d.filterType}
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
          placeholder={VALUE_PLACEHOLDER[d.filterType] ?? 'value'}
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
