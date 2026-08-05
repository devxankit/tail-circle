import { io } from 'socket.io-client';
import { getAccessToken } from './api';

/**
 * Singleton Socket.IO client. Connect after login, disconnect on logout:
 *
 *   import { connectSocket, getSocket, disconnectSocket } from '@/services/socket';
 *   const socket = connectSocket();
 *   socket.on('notification:new', handler);
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  if (socket && !socket.disconnected) return socket;

  socket = io(SOCKET_URL, {
    auth: (cb) => cb({ token: getAccessToken() }),
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 10_000,
    timeout: 5000,
  });

  socket.on('connect_error', (err) => {
    // If Socket.IO returns 404 or fails on serverless Vercel, log once and avoid spam
    if (err?.message?.includes('404') || err?.description === 404) {
      console.warn('Socket.IO endpoint unavailable (using REST polling fallback)');
      socket.disconnect();
    }
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
