import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message } from '../types';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

export function useSocket(
  token: string | null,
  onMessage: (msg: Message) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [status, setStatus] = useState<SocketStatus>('disconnected');

  useEffect(() => {
    if (!token) return;

    setStatus('connecting');
    const socket = io('/', {
      path: '/ws/socket.io',
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));
    socket.on('message', (msg: Message) => onMessageRef.current(msg));
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      setStatus('disconnected');
    };
  }, [token]);

  const subscribe = useCallback((pipelineId: string) => {
    socketRef.current?.emit('subscribe', { pipelineId });
  }, []);

  const unsubscribe = useCallback((pipelineId: string) => {
    socketRef.current?.emit('unsubscribe', { pipelineId });
  }, []);

  return { subscribe, unsubscribe, status };
}
