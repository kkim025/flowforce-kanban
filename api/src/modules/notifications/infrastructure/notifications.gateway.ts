import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from '../domain/notification.entity';
import { INotificationsEmitter } from './notifications.emitter';
import { NotificationMapper } from './persistence/notification.mapper';
import { WsJwtGuard } from './ws-jwt.guard';

/**
 * Socket.IO gateway that authenticates connections via JWT, joins each
 * socket to its `user:<userId>` room, and pushes `notification` events.
 *
 * Implements `INotificationsEmitter` so the listener can push without
 * importing socket.io types.
 *
 * The class-level `@UseGuards(WsJwtGuard)` runs *before* `handleConnection`
 * is invoked, so a rejected handshake never reaches the connection callback
 * — the framework closes the socket before we have to.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, INotificationsEmitter
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  public server!: Server;

  public handleConnection(client: Socket): void {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) {
      // Defensive: the guard should have rejected this already. If somehow it
      // didn't, drop the connection rather than let an unauth socket join a room.
      this.logger.warn(
        `handleConnection reached without userId on data — closing socket ${client.id}`,
      );
      client.disconnect(true);
      return;
    }
    void client.join(`user:${userId}`);
  }

  public handleDisconnect(_client: Socket): void {
    // Socket.IO auto-removes the socket from rooms; nothing to do.
  }

  public emitTo(userId: string, notification: Notification): void {
    if (!this.server) return;
    // Delegate to the mapper so the wire shape has a single source of truth
    // (and a future field added to Notification lands in one place).
    const payload = NotificationMapper.toWire(notification);
    this.server.to(`user:${userId}`).emit('notification', payload);
  }
}
