'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

export function useSocket(
  events: Record<string, (...args: any[]) => void>,
  deps: React.DependencyList = []
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('join:admin');

    for (const [event, handler] of Object.entries(events)) {
      socket.on(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(events)) {
        socket.off(event, handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return socketRef.current;
}
