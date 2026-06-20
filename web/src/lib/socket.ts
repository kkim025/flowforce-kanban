import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client. The first call constructs the
 * client and reads the current JWT from localStorage; subsequent calls
 * return the same instance. After a logout (or token rotation in a
 * different tab) callers should invoke `resetSocket()` so the next
 * `getSocket()` rebuilds with the new token.
 */
export function getSocket(): Socket {
  if (!socket) {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    socket = io(apiUrl, {
      auth: { token: localStorage.getItem('flowforce_token') },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/**
 * Tears down the singleton. Used by the auth flow on logout so the next
 * session opens a fresh socket bound to the new token.
 */
export function resetSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
