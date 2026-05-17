import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function OutputNode({ data }: NodeProps) {
  return (
    <div style={styles.wrapper}>
      <Handle type="target" position={Position.Left} />
      <div>
        <div style={styles.label}>✅ Output</div>
        <div style={styles.sub}>pipeline.filtered</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { padding: '10px 14px', background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: '8px', minWidth: '140px' },
  label: { fontWeight: 600, fontSize: '13px' },
  sub: { fontSize: '11px', color: '#666', marginTop: '2px' },
};
