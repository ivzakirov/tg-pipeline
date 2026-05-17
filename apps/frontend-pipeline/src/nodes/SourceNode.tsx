import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export interface SourceNodeData {
  label: string;
  telegramId: number;
  type: 'channel' | 'group';
  [key: string]: unknown;
}

export default function SourceNode({ data }: NodeProps) {
  const d = data as SourceNodeData;
  return (
    <div style={styles.wrapper}>
      <div style={styles.icon}>{d.type === 'channel' ? '📢' : '👥'}</div>
      <div>
        <div style={styles.label}>{d.label}</div>
        <div style={styles.sub}>@{d.telegramId}</div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', background: '#e8f4fd', border: '2px solid #2AABEE', borderRadius: '8px', minWidth: '160px' },
  icon: { fontSize: '20px' },
  label: { fontWeight: 600, fontSize: '13px' },
  sub: { fontSize: '11px', color: '#666' },
};
