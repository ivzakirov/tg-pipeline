import React, { useEffect, useState } from 'react';

interface Props {
  url: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function ImageViewer({ url, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => { setRotation(0); }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const rotate = (e: React.MouseEvent) => { e.stopPropagation(); setRotation((r) => (r + 90) % 360); };

  const parts = url.split('/');
  const filename = `photo_${parts[parts.length - 1]}.jpg`;

  const isTransposed = rotation % 180 !== 0;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.toolbar} onClick={(e) => e.stopPropagation()}>
        <button style={styles.btn} onClick={rotate} title="Rotate">↻</button>
        <a
          href={url}
          download={filename}
          style={styles.btn as React.CSSProperties}
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >⬇</a>
        <button style={styles.btn} onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close">✕</button>
      </div>

      {hasPrev && (
        <button style={{ ...styles.arrow, left: '16px' }} onClick={(e) => { e.stopPropagation(); onPrev?.(); }}>‹</button>
      )}
      {hasNext && (
        <button style={{ ...styles.arrow, right: '16px' }} onClick={(e) => { e.stopPropagation(); onNext?.(); }}>›</button>
      )}

      <div style={styles.imageWrap} onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt=""
          style={{
            ...styles.image,
            maxWidth: isTransposed ? '90vh' : '90vw',
            maxHeight: isTransposed ? '90vw' : '90vh',
            transform: `rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 10000,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  toolbar: {
    position: 'absolute', top: '16px', right: '16px',
    display: 'flex', gap: '8px', zIndex: 1,
  },
  btn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
    color: '#fff', fontSize: '18px', width: '42px', height: '42px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    textDecoration: 'none',
  },
  arrow: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
    color: '#fff', fontSize: '40px', width: '56px', height: '56px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1, lineHeight: 1,
  },
  imageWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  image: {
    objectFit: 'contain',
    transition: 'transform 0.2s ease',
    borderRadius: '4px',
  },
};
