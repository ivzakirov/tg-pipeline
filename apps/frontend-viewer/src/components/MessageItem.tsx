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
  // Use sender's own avatar when available; fall back to channel avatar for anonymous posts
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
      setBgColor('var(--bg-highlight)');
    } else if (!highlighted && prevHighlighted.current) {
      setTransition('background-color 1.5s ease');
      setBgColor(undefined);
    }
    prevHighlighted.current = !!highlighted;
  }, [highlighted]);

  return (
    <div
      style={{ ...styles.wrapper, backgroundColor: bgColor, transition }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setBlockHovered(false); }}
    >
      <div style={{ ...styles.avatarWrap, background: avatarColor(avatarId) }}>
        {showImg ? (
          <img
            src={`/api/avatars/${avatarId}`}
            alt=""
            style={styles.avatarImg}
            onError={() => { failedAvatarIds.add(avatarId); setImgFailed(true); }}
          />
        ) : (
          <span style={styles.avatarLetter}>{message.senderName.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div style={styles.body}>
        <div style={styles.header}>
          <span style={styles.sender}>{message.senderName}</span>
            {onBlockSender && (
              <span
                style={{ ...styles.blockBtn, opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none', background: blockHovered ? '#ffd0d0' : '#eee', color: blockHovered ? '#c00' : '#999' }}
                title={`Block ${message.senderName}`}
                onMouseEnter={() => setBlockHovered(true)}
                onMouseLeave={() => setBlockHovered(false)}
                onClick={(e) => { e.stopPropagation(); onBlockSender(message.senderId, message.senderName); }}
              >✕</span>
            )}
          <span style={styles.time}>{time}</span>
        </div>
        {message.replyToMsgId && (
          <div
            style={{ ...styles.replyBlock, cursor: onReplyClick ? 'pointer' : 'default' }}
            onClick={() => onReplyClick?.(message.replyToMsgId!)}
          >
            <div style={styles.replyBar} />
            <div style={styles.replyContent}>
              <span style={styles.replyAuthor}>{message.replyToSenderName ?? 'Unknown'}</span>
              <span style={styles.replyText}>{message.replyToText ?? '[media]'}</span>
            </div>
          </div>
        )}
        <p style={styles.text}>{message.text || <em style={{ color: '#999' }}>[media]</em>}</p>
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
                style={{ ...styles.mediaImg, cursor: onImageClick ? 'zoom-in' : 'default' }}
                alt=""
                onClick={onImageClick ? (e) => { e.stopPropagation(); onImageClick(mediaUrl); } : undefined}
                onError={() => { failedMediaUrls.add(mediaUrl); }}
              />
            );
          }
          if (mediaUrl && mime.startsWith('video/')) {
            if (failedMediaUrls.has(mediaUrl)) return <span style={styles.badge}>Video</span>;
            return (
              <div style={styles.videoThumb}>
                <img
                  src={mediaUrl}
                  style={styles.mediaImg}
                  alt=""
                  onError={() => { failedMediaUrls.add(mediaUrl); }}
                />
                <span style={styles.playIcon}>▶</span>
              </div>
            );
          }
          if (mediaUrl && mime.startsWith('audio/')) {
            return <audio controls src={mediaUrl} style={styles.audio} />;
          }
          return <span style={styles.badge}>{message.mediaType.replace('MessageMedia', '')}</span>;
        })()}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-light)' },
  avatarWrap: { width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  avatarLetter: { color: '#fff', fontWeight: 700, fontSize: '16px' },
  body: { flex: 1, minWidth: 0 },
  header: { display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '4px' },
  sender: { fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' },
  time: { marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' },
  text: { fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: 1.5, margin: 0 },
  badge: { display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-badge)', fontSize: '11px', color: 'var(--text-badge)' },
  mediaImg: { display: 'block', maxWidth: '300px', maxHeight: '400px', borderRadius: '8px', marginTop: '6px', objectFit: 'cover' as const },
  videoThumb: { position: 'relative' as const, display: 'inline-block', marginTop: '6px' },
  playIcon: { position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '28px', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.6)', pointerEvents: 'none' as const },
  audio: { display: 'block', marginTop: '6px', width: '280px' },
  replyBlock: { display: 'flex', gap: '6px', marginBottom: '5px', cursor: 'default' },
  replyBar: { width: '3px', borderRadius: '2px', background: '#2AABEE', flexShrink: 0 },
  replyContent: { background: 'var(--bg-reply)', borderRadius: '4px', padding: '3px 8px', minWidth: 0, overflow: 'hidden' },
  replyAuthor: { display: 'block', fontSize: '11px', fontWeight: 600, color: '#2AABEE', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  replyText: { display: 'block', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  blockBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', fontSize: '10px', cursor: 'pointer', userSelect: 'none' as const, transition: 'background 0.1s' },
};
