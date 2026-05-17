import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import axios from 'axios';
import { useSocket } from './hooks/useSocket';
import MessageItem from './components/MessageItem';
import type { Message, Pipeline } from './types';

// Token passed from shell via window or storage (in real app use shared context)
function getToken(): string | null {
  return (window as any).__TG_ACCESS_TOKEN__ ?? null;
}

export default function App() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((msg: Message) => {
    if (msg.pipelineId === activePipelineId) {
      setMessages((prev) => [msg, ...prev]);
    }
  }, [activePipelineId]);

  const { subscribe, unsubscribe } = useSocket(getToken(), handleMessage);

  useEffect(() => {
    axios.get('/api/pipelines', {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(({ data }) => setPipelines(data));
  }, []);

  const selectPipeline = async (pipelineId: string) => {
    if (activePipelineId) unsubscribe(activePipelineId);
    setActivePipelineId(pipelineId);
    setMessages([]);
    setLoading(true);

    subscribe(pipelineId);

    try {
      const { data } = await axios.get(`/api/messages/${pipelineId}?limit=50`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setMessages(data.reverse());
    } finally {
      setLoading(false);
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTitle}>Pipelines</div>
        {pipelines.map((p) => (
          <div
            key={p.id}
            style={{ ...styles.sidebarItem, background: p.id === activePipelineId ? '#e8f4fd' : 'transparent' }}
            onClick={() => selectPipeline(p.id)}
          >
            <span style={styles.pipelineDot(p.enabled)} />
            {p.name}
          </div>
        ))}
        {pipelines.length === 0 && (
          <p style={styles.empty}>No pipelines yet.<br />Create one in Pipelines tab.</p>
        )}
      </div>

      {/* Message feed */}
      <div style={styles.feed}>
        {!activePipelineId && (
          <div style={styles.placeholder}>Select a pipeline to view messages</div>
        )}
        {activePipelineId && loading && (
          <div style={styles.placeholder}>Loading history...</div>
        )}
        {activePipelineId && !loading && (
          <div ref={parentRef} style={styles.scrollArea}>
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vi) => (
                <div
                  key={vi.index}
                  style={{ position: 'absolute', top: vi.start, left: 0, right: 0 }}
                  ref={rowVirtualizer.measureElement}
                  data-index={vi.index}
                >
                  <MessageItem message={messages[vi.index]} />
                </div>
              ))}
            </div>
            {messages.length === 0 && (
              <div style={styles.placeholder}>No messages yet. Waiting for new ones...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  root: { display: 'flex', height: '100%', overflow: 'hidden' },
  sidebar: { width: '260px', borderRight: '1px solid #e5e5e5', background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  sidebarTitle: { padding: '16px', fontWeight: 700, fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sidebarItem: { padding: '12px 16px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px', margin: '2px 8px' },
  pipelineDot: (enabled: boolean) => ({ width: 8, height: 8, borderRadius: '50%', background: enabled ? '#4caf50' : '#bbb', flexShrink: 0 }),
  empty: { padding: '16px', fontSize: '13px', color: '#aaa', textAlign: 'center' as const, lineHeight: 1.6 },
  feed: { flex: 1, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  scrollArea: { flex: 1, overflowY: 'auto' as const },
  placeholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: '14px', textAlign: 'center' as const },
};
