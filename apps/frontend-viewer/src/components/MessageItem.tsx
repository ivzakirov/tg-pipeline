import React from 'react';
import type { Message } from '../types';

interface Props {
  message: Message;
}

export default function MessageItem({ message }: Props) {
  const time = new Date(message.timestamp ?? message.receivedAt ?? '').toLocaleTimeString();

  return (
    <div style={styles.wrapper}>
      <div style={styles.avatar}>{message.senderName.charAt(0).toUpperCase()}</div>
      <div style={styles.body}>
        <div style={styles.header}>
          <span style={styles.sender}>{message.senderName}</span>
          <span style={styles.channel}>#{message.pipelineName}</span>
          <span style={styles.time}>{time}</span>
        </div>
        <p style={styles.text}>{message.text || <em style={{ color: '#999' }}>[media]</em>}</p>
        {message.mediaType && (
          <span style={styles.badge}>{message.mediaType.replace('MessageMedia', '')}</span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', gap: '12px', padding: '10px 16px', borderBottom: '1px solid #f0f0f0' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#2AABEE', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  header: { display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '4px' },
  sender: { fontWeight: 600, fontSize: '14px' },
  channel: { fontSize: '12px', color: '#2AABEE' },
  time: { marginLeft: 'auto', fontSize: '11px', color: '#aaa' },
  text: { fontSize: '14px', color: '#222', wordBreak: 'break-word', lineHeight: 1.5 },
  badge: { display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', background: '#f0f0f0', fontSize: '11px', color: '#666' },
};
