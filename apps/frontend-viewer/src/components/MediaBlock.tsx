import React from 'react';
import type { Message } from '../types';

const failedMediaUrls = new Set<string>();

interface Props {
  message: Message;
  onImageClick?: (url: string) => void;
}

export default function MediaBlock({ message, onImageClick }: Props) {
  if (!message.mediaType) return null;

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
    if (failedMediaUrls.has(mediaUrl)) {
      return (
        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-tg-badge-bg dark:bg-tg-badge-bg-dark text-[11px] text-tg-text-badge dark:text-tg-text-badge-dark">
          Video
        </span>
      );
    }
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
}
