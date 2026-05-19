import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message } from '../types';

export function useSocket(
  token: string | null,
  onMessage: (msg: Message) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!token) return;

    const socket = io('/', {
      path: '/ws/socket.io',
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('message', (msg: Message) => onMessageRef.current(msg));
    socketRef.current = socket;

    return () => { socket.disconnect(); };
  }, [token]);

  const subscribe = useCallback((pipelineId: string) => {
    socketRef.current?.emit('subscribe', { pipelineId });
  }, []);

  const unsubscribe = useCallback((pipelineId: string) => {
    socketRef.current?.emit('unsubscribe', { pipelineId });
  }, []);

  return { subscribe, unsubscribe };
}
