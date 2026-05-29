import React, { useCallback, useEffect, useRef, useState } from 'react';
import './index.css';
import api from './api';
import { useSocket } from './hooks/useSocket';
import { useToast } from './hooks/useToast';
import { useLightbox } from './hooks/useLightbox';
import Sidebar from './components/Sidebar';
import MessageFeed from './components/MessageFeed';
import ImageViewer from './components/ImageViewer';
import type { Message, Pipeline } from './types';

function getToken(): string | null {
  return (window as any).__TG_ACCESS_TOKEN__ ?? null;
}

export default function App() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [highlightedTelegramMsgId, setHighlightedTelegramMsgId] = useState<number | null>(null);

  const activePipelineIdRef = useRef<string | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const prependCountRef = useRef(0);

  const { toast, showToast } = useToast();
  const { lightboxIndex, setLightboxIndex, imageUrls, openLightbox } = useLightbox(messages);

  const handleMessage = useCallback((msg: Message) => {
    if (msg.pipelineId === activePipelineId) {
      const normalized: Message = { ...msg, telegramMessageId: msg.telegramMessageId ?? (msg as any).messageId };
      setMessages((prev) => [...prev, normalized]);
    }
  }, [activePipelineId]);

  const { subscribe, unsubscribe, status } = useSocket(getToken(), handleMessage);

  useEffect(() => {
    api.get('/api/pipelines').then(({ data }) => setPipelines(data));
  }, []);

  const selectPipeline = async (pipelineId: string) => {
    if (activePipelineIdRef.current) unsubscribe(activePipelineIdRef.current);
    activePipelineIdRef.current = pipelineId;
    setActivePipelineId(pipelineId);
    setMessages([]);
    setHasMore(false);
    loadingMoreRef.current = false;
    prependCountRef.current = 0;
    setLoading(true);
    subscribe(pipelineId);
    try {
      const { data } = await api.get(`/api/messages/${pipelineId}?limit=50`);
      if (activePipelineIdRef.current === pipelineId) {
        shouldAutoScrollRef.current = true;
        setMessages((data as Message[]).reverse());
        setHasMore(data.length >= 50);
      }
    } finally {
      if (activePipelineIdRef.current === pipelineId) setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (loadingMoreRef.current || !hasMore || !activePipelineIdRef.current) return;
    const oldest = messages[0];
    if (!oldest?.receivedAt) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const pipelineId = activePipelineIdRef.current;
    try {
      const { data } = await api.get(
        `/api/messages/${pipelineId}?limit=50&before=${encodeURIComponent(oldest.receivedAt)}`,
      );
      if (activePipelineIdRef.current !== pipelineId) return;
      if (data.length < 50) setHasMore(false);
      if (data.length === 0) return;
      const older = (data as Message[]).reverse();
      prependCountRef.current = older.length;
      setMessages((prev) => [...older, ...prev]);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
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

  const handleReplyHighlight = useCallback((replyToMsgId: number) => {
    setHighlightedTelegramMsgId(replyToMsgId);
    setTimeout(() => setHighlightedTelegramMsgId(null), 2000);
  }, []);

  return (
    <div className="flex h-full overflow-hidden bg-tg-surface dark:bg-tg-surface-dark">
      <Sidebar
        pipelines={pipelines}
        activePipelineId={activePipelineId}
        onSelect={selectPipeline}
        status={status}
      />
      <MessageFeed
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        loadingMoreRef={loadingMoreRef}
        prependCountRef={prependCountRef}
        shouldAutoScrollRef={shouldAutoScrollRef}
        onLoadMore={loadOlderMessages}
        onBlockSender={blockSender}
        onReplyClick={handleReplyHighlight}
        onImageClick={openLightbox}
        highlightedTelegramMsgId={highlightedTelegramMsgId}
        activePipelineId={activePipelineId}
      />
      {lightboxIndex !== null && imageUrls[lightboxIndex] && (
        <ImageViewer
          url={imageUrls[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < imageUrls.length - 1}
          onPrev={() => setLightboxIndex((i) => (i !== null ? i - 1 : null))}
          onNext={() => setLightboxIndex((i) => (i !== null ? i + 1 : null))}
        />
      )}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 text-white px-[18px] py-2.5 rounded-md text-[13px] shadow-[0_2px_8px_rgba(0,0,0,0.3)] z-[9999] pointer-events-none ${
            toast.type === 'success' ? 'bg-[#323232]' : 'bg-[#c62828]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
