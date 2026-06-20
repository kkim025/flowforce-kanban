import { Notification } from '../domain/notification.entity';

/**
 * Port for pushing notifications to a connected client. Implemented by the
 * WebSocket gateway in production; mocked in tests.
 */
export interface INotificationsEmitter {
  emitTo(userId: string, notification: Notification): void;
}

export const NOTIFICATIONS_EMITTER = 'INotificationsEmitter';
