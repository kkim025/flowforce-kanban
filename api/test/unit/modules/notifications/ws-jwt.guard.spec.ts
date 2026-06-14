import { WsJwtGuard } from 'src/modules/notifications/infrastructure/ws-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let mockJwt: jest.Mocked<JwtService>;

  beforeEach(() => {
    mockJwt = { verifyAsync: jest.fn() } as any;
    guard = new WsJwtGuard(mockJwt);
  });

  function makeContext(token: string | undefined): ExecutionContext {
    const socket = {
      handshake: { auth: token === undefined ? {} : { token } },
      data: {},
    } as unknown as Socket;
    return {
      switchToWs: () => ({ getClient: () => socket }),
    } as unknown as ExecutionContext;
  }

  it('rejects when the token is missing', async () => {
    const ctx = makeContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(WsException);
  });

  it('rejects when the token is invalid', async () => {
    mockJwt.verifyAsync.mockRejectedValue(new Error('bad'));
    const ctx = makeContext('bad-token');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(WsException);
  });

  it('accepts a valid token and attaches userId to socket.data', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'a@b.c' });
    const ctx = makeContext('good-token');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const socket = ctx.switchToWs().getClient<Socket>();
    expect((socket.data as { userId: string }).userId).toBe('u1');
  });
});
