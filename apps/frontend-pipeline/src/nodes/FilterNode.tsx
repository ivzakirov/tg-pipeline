import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export interface FilterNodeData {
  filterType: 'keyword' | 'regex' | 'sender' | 'has_media' | 'media_type' | 'AND' | 'OR' | 'NOT';
  value?: string;
  negate?: boolean;
  [key: string]: unknown;
}

const TYPE_LABELS: Record<string, string> = {
  keyword: '🔤 Keyword',
  regex: '🔣 Regex',
  sender: '👤 Sender',
  has_media: '📎 Has Media',
  media_type: '🖼 Media Type',
  AND: '⋀ AND',
  OR: '⋁ OR',
  NOT: '¬ NOT',
};

export default function FilterNode({ data }: NodeProps) {
  const d = data as FilterNodeData;
  const isLogic = ['AND', 'OR', 'NOT'].includes(d.filterType);
  return (
    <div style={{ ...styles.wrapper, borderColor: isLogic ? '#ff9800' : '#4caf50' }}>
      <Handle type="target" position={Position.Left} />
      <div>
        <div style={styles.type}>{TYPE_LABELS[d.filterType] ?? d.filterType}</div>
        {d.value && <div style={styles.value}>{String(d.value)}</div>}
        {d.negate && <div style={styles.negate}>NEGATE</div>}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { padding: '8px 12px', background: '#fff', border: '2px solid #4caf50', borderRadius: '8px', minWidth: '130px' },
  type: { fontWeight: 600, fontSize: '13px' },
  value: { fontSize: '11px', color: '#555', marginTop: '2px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  negate: { fontSize: '10px', color: '#e53935', marginTop: '2px' },
};
