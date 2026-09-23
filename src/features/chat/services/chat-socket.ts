import { io, Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/config';

let socket: Socket | null = null;

/**
 * Returns a shared Socket.IO instance connected to the /chat namespace.
 */
export function getChatSocket(): Socket {
  if (!socket) {
    socket = io(`${API_BASE}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
  }
  return socket;
}

/**
 * Ensures the socket is connected.
 */
export function connectChatSocket(): Socket {
  const s = getChatSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/**
 * Disconnects the socket if open and cleans up listeners and instance.
 */
export function disconnectChatSocket() {
  if (socket) {
    socket.removeAllListeners();
    if (socket.connected) {
      socket.disconnect();
    }
    socket = null;
  }
}
