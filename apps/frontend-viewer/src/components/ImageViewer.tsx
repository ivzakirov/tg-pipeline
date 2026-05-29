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

  const btnClass = 'bg-white/15 border-none rounded-lg text-white text-lg w-[42px] h-[42px] cursor-pointer flex items-center justify-center no-underline';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/92 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
        <button className={btnClass} onClick={rotate} title="Rotate">↻</button>
        <a
          href={url}
          download={filename}
          className={btnClass}
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >⬇</a>
        <button className={btnClass} onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close">✕</button>
      </div>

      {hasPrev && (
        <button
          className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/15 border-none rounded-full text-white text-[40px] w-14 h-14 cursor-pointer flex items-center justify-center z-10 leading-none"
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
        >‹</button>
      )}
      {hasNext && (
        <button
          className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/15 border-none rounded-full text-white text-[40px] w-14 h-14 cursor-pointer flex items-center justify-center z-10 leading-none"
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
        >›</button>
      )}

      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt=""
          style={{
            maxWidth: isTransposed ? '90vh' : '90vw',
            maxHeight: isTransposed ? '90vw' : '90vh',
            transform: `rotate(${rotation}deg)`,
            objectFit: 'contain',
            transition: 'transform 0.2s ease',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}
