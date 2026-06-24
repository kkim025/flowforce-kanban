/**
 * Wire shape of a JWT payload. Shared by `JwtStrategy` (HTTP) and
 * `WsJwtGuard` (Socket.IO) so the two authentication paths cannot diverge.
 */
export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}
