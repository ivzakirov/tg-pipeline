import { useCallback, useMemo, useState } from 'react';
import type { Message } from '../types';

export function useLightbox(messages: Message[]) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imageUrls = useMemo(
    () =>
      messages
        .filter(
          (m) =>
            m.telegramMessageId &&
            (m.mediaMimeType?.startsWith('image/') || m.mediaType === 'MessageMediaPhoto'),
        )
        .map((m) => `/api/media/${m.channelId}/${m.telegramMessageId}`),
    [messages],
  );

  const openLightbox = useCallback(
    (url: string) => {
      const idx = imageUrls.indexOf(url);
      if (idx !== -1) setLightboxIndex(idx);
    },
    [imageUrls],
  );

  return { lightboxIndex, setLightboxIndex, imageUrls, openLightbox };
}
