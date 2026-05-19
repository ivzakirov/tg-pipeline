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
    <div style={styles.wrapper}>
      <div style={styles.icon}>{d.type === 'channel' ? '📢' : '👥'}</div>
      <div style={{ flex: 1 }}>
        <div style={styles.label}>{d.label}</div>
        <div style={styles.sub}>@{d.telegramId}</div>
      </div>
      <button
        className="nodrag"
        style={styles.deleteBtn}
        onClick={() => deleteElements({ nodes: [{ id }] })}
        title="Remove from canvas"
      >×</button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', background: '#e8f4fd', border: '2px solid #2AABEE', borderRadius: '8px', minWidth: '160px' },
  icon: { fontSize: '20px' },
  label: { fontWeight: 600, fontSize: '13px' },
  sub: { fontSize: '11px', color: '#666' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1, color: '#bbb', padding: '0 2px', borderRadius: '3px' },
};
