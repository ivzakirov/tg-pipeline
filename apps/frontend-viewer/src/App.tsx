import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import api from './api';
import { useSocket } from './hooks/useSocket';
import MessageItem from './components/MessageItem';
import type { Message, Pipeline } from './types';

function getToken(): string | null {
  return (window as any).__TG_ACCESS_TOKEN__ ?? null;
}

export default function App() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [highlightedTelegramMsgId, setHighlightedTelegramMsgId] = useState<number | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((msg: Message) => {
    if (msg.pipelineId === activePipelineId) {
      // WebSocket sends messageId (Telegram ID); normalize to telegramMessageId
      const normalized: Message = { ...msg, telegramMessageId: msg.telegramMessageId ?? (msg as any).messageId };
      setMessages((prev) => [normalized, ...prev]);
    }
  }, [activePipelineId]);

  const { subscribe, unsubscribe } = useSocket(getToken(), handleMessage);

  useEffect(() => {
    api.get('/api/pipelines').then(({ data }) => setPipelines(data));
  }, []);

  const selectPipeline = async (pipelineId: string) => {
    if (activePipelineId) unsubscribe(activePipelineId);
    setActivePipelineId(pipelineId);
    setMessages([]);
    setLoading(true);

    subscribe(pipelineId);

    try {
      const { data } = await api.get(`/api/messages/${pipelineId}?limit=50`);
      setMessages(data.reverse());
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const blockSender = async (senderId: number, senderName: string) => {
    if (!activePipelineId) return;
    try {
      const { data: pipeline } = await api.get(`/api/pipelines/${activePipelineId}`);
      const senderIdStr = String(senderId);
      const newCondition = { type: 'sender', value: senderIdStr, negate: true, label: senderName };
      const existing = pipeline.filterConfig;
      let newConfig: any;
      if (!existing) {
        newConfig = { operator: 'AND', children: [newCondition] };
      } else if (existing.operator === 'AND') {
        const alreadyBlocked = existing.children?.some(
          (c: any) => c.type === 'sender' && c.value === senderIdStr && c.negate,
        );
        if (alreadyBlocked) { showToast(`${senderName} is already blocked`); return; }
        newConfig = { ...existing, children: [...existing.children, newCondition] };
      } else {
        newConfig = { operator: 'AND', children: [existing, newCondition] };
      }
      await api.patch(`/api/pipelines/${activePipelineId}`, { filterConfig: newConfig });
      showToast(`Blocked: ${senderName}`);
    } catch {
      showToast('Failed to block sender', 'error');
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  const handleReplyClick = (replyToMsgId: number) => {
    const targetId = Number(replyToMsgId);
    const idx = messages.findIndex((m) => Number(m.telegramMessageId) === targetId);
    if (idx === -1) return;
    rowVirtualizer.scrollToIndex(idx, { behavior: 'smooth', align: 'center' });
    setHighlightedTelegramMsgId(targetId);
    setTimeout(() => setHighlightedTelegramMsgId(null), 2000);
  };

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTitle}>Pipelines</div>
        {pipelines.map((p) => (
          <div
            key={p.id}
            style={{ ...styles.sidebarItem, background: p.id === activePipelineId ? 'var(--bg-active)' : 'transparent' }}
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
                  <MessageItem
                    message={messages[vi.index]}
                    onBlockSender={blockSender}
                    onReplyClick={handleReplyClick}
                    highlighted={Number(messages[vi.index]?.telegramMessageId) === highlightedTelegramMsgId && highlightedTelegramMsgId !== null}
                  />
                </div>
              ))}
            </div>
            {messages.length === 0 && (
              <div style={styles.placeholder}>No messages yet. Waiting for new ones...</div>
            )}
          </div>
        )}
      </div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: toast.type === 'success' ? '#323232' : '#c62828',
          color: '#fff', padding: '10px 18px', borderRadius: '6px',
          fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  root: { display: 'flex', height: '100%', overflow: 'hidden' },
  sidebar: { width: '260px', borderRight: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  sidebarTitle: { padding: '16px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sidebarItem: { padding: '12px 16px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px', margin: '2px 8px', color: 'var(--text-primary)' },
  pipelineDot: (enabled: boolean) => ({ width: 8, height: 8, borderRadius: '50%', background: enabled ? '#4caf50' : '#bbb', flexShrink: 0 }),
  empty: { padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' as const, lineHeight: 1.6 },
  feed: { flex: 1, background: 'var(--bg-primary)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  scrollArea: { flex: 1, overflowY: 'auto' as const },
  placeholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' as const },
};
