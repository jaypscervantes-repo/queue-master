import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export type SocketEventMap = {
  'queue:update': void;
  'court:update': void;
  'match:created': { matchId: string };
  'match:ended': { matchId: string; courtId: string };
  'player:update': { playerId: string };
  'stats:update': void;
};
