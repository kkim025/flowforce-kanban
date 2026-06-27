import { NotificationsGateway } from 'src/modules/notifications/infrastructure/notifications.gateway';
import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';
import { Server, Socket } from 'socket.io';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let mockServer: { to: jest.Mock };
  let mockToRoom: { emit: jest.Mock };

  beforeEach(() => {
    mockToRoom = { emit: jest.fn() };
    mockServer = { to: jest.fn().mockReturnValue(mockToRoom) };
    gateway = new NotificationsGateway();
    gateway.server = mockServer as unknown as Server;
  });

  it('emits to the user:<id> room with the notification event', () => {
    const notification = Notification.create(
      {
        recipientId: 'u1',
        type: NotificationType.ASSIGNMENT,
        title: 't',
        refType: 'task',
        refId: 'task-1',
      },
      'n1',
    ).getValue();
    gateway.emitTo('u1', notification);
    expect(mockServer.to).toHaveBeenCalledWith('user:u1');
    expect(mockToRoom.emit).toHaveBeenCalledWith('notification', {
      id: 'n1',
      type: NotificationType.ASSIGNMENT,
      title: 't',
      body: null,
      refType: 'task',
      refId: 'task-1',
      boardId: null,
      actorId: null,
      actorName: null,
      milestone: null,
      readAt: null,
      // Wire shape falls back to `new Date()` when the entity hasn't been
      // persisted yet (createdAt is undefined on a brand-new notification).
      createdAt: expect.any(Date),
    });
  });

  it('handles connection by joining the user room from handshake auth', () => {
    const join = jest.fn();
    const socket = {
      data: { userId: 'u1' },
      join,
      handshake: { auth: { token: 'jwt' } },
    } as unknown as Socket;
    gateway.handleConnection(socket);
    expect(join).toHaveBeenCalledWith('user:u1');
  });
});
