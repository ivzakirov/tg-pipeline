import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';

export interface FilterNodeData {
  filterType: 'keyword' | 'regex' | 'sender' | 'has_media' | 'media_type' | 'AND' | 'OR' | 'NOT';
  value?: string;
  negate?: boolean;
  [key: string]: unknown;
}

const TYPE_LABELS: Record<string, string> = {
  keyword: '🔤 Keyword',
  regex: '🔣 Regex',
  sender: '👤 Sender ID',
  has_media: '📎 Has Media',
  media_type: '🖼 Media Type',
  AND: '⋀ AND',
  OR: '⋁ OR',
  NOT: '¬ NOT',
};

const VALUE_PLACEHOLDER: Record<string, string> = {
  keyword: 'e.g. bitcoin',
  regex: 'e.g. \\d{4}',
  sender: 'numeric sender ID',
  media_type: 'photo / video / document',
};

const HAS_VALUE = ['keyword', 'regex', 'sender', 'media_type'];
const IS_LOGIC = ['AND', 'OR', 'NOT'];

export default function FilterNode({ id, data }: NodeProps) {
  const d = data as FilterNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const isLogic = IS_LOGIC.includes(d.filterType);
  const hasValue = HAS_VALUE.includes(d.filterType);

  return (
    <div style={{ ...styles.wrapper, borderColor: isLogic ? '#ff9800' : '#4caf50' }}>
      <Handle type="target" position={Position.Left} />

      <div style={styles.header}>
        <div style={styles.label}>{TYPE_LABELS[d.filterType] ?? d.filterType}</div>
        <button
          className="nodrag"
          style={styles.deleteBtn}
          onClick={() => deleteElements({ nodes: [{ id }] })}
          title="Delete node"
        >×</button>
      </div>

      {hasValue && (
        <input
          style={styles.input}
          className="nodrag"
          placeholder={VALUE_PLACEHOLDER[d.filterType] ?? 'value'}
          value={d.value ?? ''}
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}

      {!isLogic && (
        <label style={styles.negateRow} className="nodrag">
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

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: '8px 10px',
    background: '#fff',
    border: '2px solid #4caf50',
    borderRadius: '8px',
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' },
  label: { fontWeight: 600, fontSize: '13px', flex: 1 },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1,
    color: '#bbb',
    padding: '0 2px',
    borderRadius: '3px',
  },
  input: {
    fontSize: '11px',
    padding: '3px 6px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  negateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#888',
    cursor: 'pointer',
  },
};
