import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getToken = () => localStorage.getItem('flowforce_token');

/**
 * Returns a singleton Socket.IO client. The first call constructs the
 * client; subsequent calls return the same instance. The JWT is read from
 * localStorage on every reconnect, so token rotations are handled automatically.
 */
export function getSocket(): Socket {
  if (!socket) {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    socket = io(apiUrl, {
      auth: { token: getToken() },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/**
 * Forces the socket to reconnect with a fresh auth payload. Call this when
 * the token has been rotated and you want the existing socket to pick it up.
 */
export function refreshSocketAuth(): void {
  if (socket) {
    socket.disconnect();
    // Re-read the (possibly new) token from localStorage before reconnecting.
    socket.auth = { token: getToken() };
    socket.connect();
  }
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
