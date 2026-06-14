import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from '../../../auth/jwt-payload.interface';

/**
 * Attaches the resolved `userId` to a copy of `socket.data`. We do not mutate
 * the original `data` object — Socket.IO's `data` is shared across middleware
 * and an in-place write would also leak the userId into the `handshake`
 * auth payload if anything else reads from it.
 */
interface AuthedSocketData {
  userId?: string;
}

/**
 * Validates the JWT supplied in `socket.handshake.auth.token` and attaches
 * the resolved `userId` to `socket.data` for downstream use.
 *
 * Throws `WsException('Unauthorized')` on missing/invalid token so the
 * framework can disconnect the offending client. Uses the shared `JwtPayload`
 * type so the wire contract is the same as the HTTP `JwtStrategy`.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token: string | undefined = client.handshake?.auth?.token;
    if (!token) {
      throw new WsException('Unauthorized');
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (!payload?.sub) {
        throw new WsException('Unauthorized');
      }
      // Spread to a new object — do not mutate the socket's shared data.
      client.data = { ...(client.data ?? {}), userId: payload.sub } as
        | AuthedSocketData
        | Record<string, unknown>;
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
