import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { JwtAuthModule } from '../../auth/jwt-auth.module';
import { NotificationPrefsModule } from '../notification-prefs/notification-prefs.module';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { GetUnreadCountUseCase } from './application/use-cases/get-unread-count.use-case';
import { ListMyNotificationsUseCase } from './application/use-cases/list-my-notifications.use-case';
import { MarkAllAsReadUseCase } from './application/use-cases/mark-all-as-read.use-case';
import { MarkAsReadUseCase } from './application/use-cases/mark-as-read.use-case';
import { NOTIFICATION_REPOSITORY } from './domain/notifications.repository.interface';
import { DueDateScanner } from './infrastructure/due-date.scanner';
import { NOTIFICATIONS_EMITTER } from './infrastructure/notifications.emitter';
import { NotificationsGateway } from './infrastructure/notifications.gateway';
import { NotificationsListener } from './infrastructure/notifications.listener';
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';
import { WsJwtGuard } from './infrastructure/ws-jwt.guard';
import { NotificationsController } from './notifications.controller';

@Module({
  // NotificationPrefsModule is imported for `USER_NOTIFICATION_PREF_REPOSITORY`,
  // which `CreateNotificationUseCase` reads to respect per-user mutes.
  // Living in its own module keeps this dep one-way (Notifications -> Prefs)
  // and breaks what would otherwise be a Notifications <-> Users cycle.
  imports: [PrismaModule, JwtAuthModule, NotificationPrefsModule],
  controllers: [NotificationsController],
  providers: [
    // Use cases
    CreateNotificationUseCase,
    GetUnreadCountUseCase,
    ListMyNotificationsUseCase,
    MarkAllAsReadUseCase,
    MarkAsReadUseCase,
    // Repositories
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    // Infrastructure — listener is a provider so @OnEvent auto-subscribes;
    // scanner is a provider so @Cron auto-registers; gateway is provided once
    // and reused as the emitter port.
    NotificationsListener,
    DueDateScanner,
    NotificationsGateway,
    {
      provide: NOTIFICATIONS_EMITTER,
      useExisting: NotificationsGateway,
    },
    WsJwtGuard,
  ],
  exports: [
    NOTIFICATION_REPOSITORY,
    ListMyNotificationsUseCase,
    MarkAsReadUseCase,
    MarkAllAsReadUseCase,
    GetUnreadCountUseCase,
    CreateNotificationUseCase,
  ],
})
export class NotificationsModule {}
