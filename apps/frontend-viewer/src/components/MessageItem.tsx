import React, { useEffect, useRef, useState } from 'react';
import type { Message } from '../types';

const failedAvatarIds = new Set<number>();
const failedMediaUrls = new Set<string>();

interface Props {
  message: Message;
  onBlockSender?: (senderId: number, senderName: string) => void;
  onReplyClick?: (replyToMsgId: number) => void;
  onImageClick?: (url: string) => void;
  highlighted?: boolean;
}

function avatarColor(id: number): string {
  const colors = ['#2AABEE', '#E91E63', '#9C27B0', '#FF5722', '#4CAF50', '#FF9800', '#00BCD4', '#795548'];
  return colors[Math.abs(id) % colors.length];
}

export default function MessageItem({ message, onBlockSender, onReplyClick, onImageClick, highlighted }: Props) {
  const time = new Date(message.timestamp ?? message.receivedAt ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const avatarId = message.senderId !== 0 ? message.senderId : message.channelId;
  const [imgFailed, setImgFailed] = useState(() => failedAvatarIds.has(avatarId));
  const [hovered, setHovered] = useState(false);
  const [blockHovered, setBlockHovered] = useState(false);
  const showImg = !imgFailed;

  // Two-phase highlight: instant on, slow fade off
  const [bgColor, setBgColor] = useState<string | undefined>(undefined);
  const [transition, setTransition] = useState('none');
  const prevHighlighted = useRef(false);
  useEffect(() => {
    if (highlighted && !prevHighlighted.current) {
      setTransition('none');
      setBgColor('var(--tg-highlight, #e3f2fd)');
    } else if (!highlighted && prevHighlighted.current) {
      setTransition('background-color 1.5s ease');
      setBgColor(undefined);
    }
    prevHighlighted.current = !!highlighted;
  }, [highlighted]);

  return (
    <div
      className="flex gap-3 px-4 py-2.5 border-b border-tg-border-light dark:border-tg-border-light-dark"
      style={{ backgroundColor: bgColor, transition }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setBlockHovered(false); }}
    >
      <div
        className="w-[38px] h-[38px] rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: avatarColor(avatarId) }}
      >
        {showImg ? (
          <img
            src={`/api/avatars/${avatarId}`}
            alt=""
            className="w-full h-full object-cover block"
            onError={() => { failedAvatarIds.add(avatarId); setImgFailed(true); }}
          />
        ) : (
          <span className="text-white font-bold text-base">{message.senderName.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-baseline mb-1">
          <span className="font-semibold text-sm text-tg-text dark:text-tg-text-dark">{message.senderName}</span>
          {onBlockSender && (
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] cursor-pointer select-none transition-colors duration-100"
              style={{
                opacity: hovered ? 1 : 0,
                pointerEvents: hovered ? 'auto' : 'none',
                background: blockHovered ? '#ffd0d0' : '#eee',
                color: blockHovered ? '#c00' : '#999',
              }}
              title={`Block ${message.senderName}`}
              onMouseEnter={() => setBlockHovered(true)}
              onMouseLeave={() => setBlockHovered(false)}
              onClick={(e) => { e.stopPropagation(); onBlockSender(message.senderId, message.senderName); }}
            >✕</span>
          )}
          <span className="ml-auto text-[11px] text-tg-text-muted dark:text-tg-text-muted-dark">{time}</span>
        </div>

        {message.replyToMsgId && (
          <div
            className="flex gap-1.5 mb-[5px]"
            style={{ cursor: onReplyClick ? 'pointer' : 'default' }}
            onClick={() => onReplyClick?.(message.replyToMsgId!)}
          >
            <div className="w-[3px] rounded-sm bg-tg-blue flex-shrink-0" />
            <div className="bg-tg-reply dark:bg-tg-reply-dark rounded px-2 py-[3px] min-w-0 overflow-hidden">
              <span className="block text-[11px] font-semibold text-tg-blue whitespace-nowrap overflow-hidden text-ellipsis">
                {message.replyToSenderName ?? 'Unknown'}
              </span>
              <span className="block text-[11px] text-tg-text-sub dark:text-tg-text-sub-dark whitespace-nowrap overflow-hidden text-ellipsis">
                {message.replyToText ?? '[media]'}
              </span>
            </div>
          </div>
        )}

        <p className="text-sm text-tg-text dark:text-tg-text-dark break-words leading-[1.5] m-0">
          {message.text || <em className="text-[#999]">[media]</em>}
        </p>

        {message.mediaType && (() => {
          const mime = message.mediaMimeType ?? '';
          const mediaUrl = message.telegramMessageId
            ? `/api/media/${message.channelId}/${message.telegramMessageId}`
            : null;
          if (mediaUrl && (mime.startsWith('image/') || message.mediaType === 'MessageMediaPhoto')) {
            if (failedMediaUrls.has(mediaUrl)) return null;
            return (
              <img
                src={mediaUrl}
                className="block max-w-[300px] max-h-[400px] rounded-lg mt-1.5 object-cover"
                style={{ cursor: onImageClick ? 'zoom-in' : 'default' }}
                alt=""
                onClick={onImageClick ? (e) => { e.stopPropagation(); onImageClick(mediaUrl); } : undefined}
                onError={() => { failedMediaUrls.add(mediaUrl); }}
              />
            );
          }
          if (mediaUrl && mime.startsWith('video/')) {
            if (failedMediaUrls.has(mediaUrl)) return <span className="inline-block mt-1 px-2 py-0.5 rounded bg-tg-badge-bg dark:bg-tg-badge-bg-dark text-[11px] text-tg-text-badge dark:text-tg-text-badge-dark">Video</span>;
            return (
              <div className="relative inline-block mt-1.5">
                <img
                  src={mediaUrl}
                  className="block max-w-[300px] max-h-[400px] rounded-lg object-cover"
                  alt=""
                  onError={() => { failedMediaUrls.add(mediaUrl); }}
                />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] text-white pointer-events-none [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">▶</span>
              </div>
            );
          }
          if (mediaUrl && mime.startsWith('audio/')) {
            return <audio controls src={mediaUrl} className="block mt-1.5 w-[280px]" />;
          }
          return (
            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-tg-badge-bg dark:bg-tg-badge-bg-dark text-[11px] text-tg-text-badge dark:text-tg-text-badge-dark">
              {message.mediaType.replace('MessageMedia', '')}
            </span>
          );
        })()}
      </div>
    </div>
  );
}
