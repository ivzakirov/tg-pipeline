import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '../types';
import MessageItem from './MessageItem';

interface Props {
  messages: Message[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onBlockSender: (senderId: number, senderName: string) => void;
  onReplyClick: (replyToMsgId: number) => void;
  onImageClick: (url: string) => void;
  highlightedTelegramMsgId: number | null;
  activePipelineId: string | null;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const toDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = toDay(now) - toDay(d);
  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

export default function MessageFeed({
  messages, loading, loadingMore, hasMore,
  onLoadMore, onBlockSender, onReplyClick, onImageClick,
  highlightedTelegramMsgId, activePipelineId,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const [dateLabelVisible, setDateLabelVisible] = useState(false);
  const dateLabelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevLengthRef = useRef(0);
  const prevFirstIdRef = useRef<number | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  useEffect(() => {
    shouldAutoScrollRef.current = true;
    prevLengthRef.current = 0;
    prevFirstIdRef.current = null;
  }, [activePipelineId]);

  useEffect(() => {
    const prevLen = prevLengthRef.current;
    const prevFirstId = prevFirstIdRef.current;
    const curFirstId = messages[0] ? Number(messages[0].telegramMessageId) : null;
    prevLengthRef.current = messages.length;
    prevFirstIdRef.current = curFirstId;

    if (prevLen > 0 && curFirstId !== prevFirstId && messages.length > prevLen) {
      rowVirtualizer.scrollToIndex(messages.length - prevLen, { align: 'start', behavior: 'auto' });
    } else if (shouldAutoScrollRef.current && messages.length > 0) {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (el.scrollTop < 200 && !loadingMore && hasMore) {
      onLoadMore();
    }
    const firstVi = rowVirtualizer.getVirtualItems()[0];
    if (firstVi != null && messages[firstVi.index]) {
      const ts = messages[firstVi.index].timestamp ?? messages[firstVi.index].receivedAt;
      if (ts) setDateLabel(formatDateLabel(ts));
    }
    setDateLabelVisible(true);
    if (dateLabelTimeoutRef.current) clearTimeout(dateLabelTimeoutRef.current);
    dateLabelTimeoutRef.current = setTimeout(() => setDateLabelVisible(false), 2000);
  }, [hasMore, messages, onLoadMore, loadingMore]); // rowVirtualizer is stable

  const handleReplyClick = useCallback((replyToMsgId: number) => {
    const targetId = Number(replyToMsgId);
    const idx = messages.findIndex((m) => Number(m.telegramMessageId) === targetId);
    if (idx === -1) return;
    rowVirtualizer.scrollToIndex(idx, { behavior: 'smooth', align: 'center' });
    onReplyClick(replyToMsgId);
  }, [messages, onReplyClick, rowVirtualizer]);

  if (!activePipelineId) {
    return (
      <div className="flex-1 bg-tg-bg dark:bg-tg-bg-dark flex items-center justify-center text-tg-text-muted dark:text-tg-text-muted-dark text-sm text-center">
        Select a pipeline to view messages
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 bg-tg-bg dark:bg-tg-bg-dark flex items-center justify-center text-tg-text-muted dark:text-tg-text-muted-dark text-sm">
        Loading history...
      </div>
    );
  }

  return (
    <div className="flex-1 bg-tg-surface dark:bg-tg-surface-dark overflow-hidden flex flex-col relative">
      {dateLabel && (
        <div
          className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-black/45 text-white text-xs font-medium px-3 py-1 rounded-xl pointer-events-none z-10 transition-opacity duration-300 whitespace-nowrap"
          style={{ opacity: dateLabelVisible ? 1 : 0 }}
        >
          {dateLabel}
        </div>
      )}
      <div ref={parentRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {loadingMore && (
          <div className="text-center py-2 text-xs text-tg-text-muted dark:text-tg-text-muted-dark">
            Loading older messages…
          </div>
        )}
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
                onBlockSender={onBlockSender}
                onReplyClick={handleReplyClick}
                onImageClick={onImageClick}
                highlighted={
                  Number(messages[vi.index]?.telegramMessageId) === highlightedTelegramMsgId &&
                  highlightedTelegramMsgId !== null
                }
              />
            </div>
          ))}
        </div>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-tg-text-muted dark:text-tg-text-muted-dark text-sm text-center">
            No messages yet. Waiting for new ones...
          </div>
        )}
      </div>
    </div>
  );
}
