import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { USER_NOTIFICATION_PREF_REPOSITORY } from './domain/user-notification-prefs.repository.interface';
import { PrismaUserNotificationPrefRepository } from './infrastructure/persistence/prisma-user-notification-pref.repository';

/**
 * Shared module that owns the per-user notification-preference repository.
 *
 * Exists so that both `UsersModule` (prefs are a user concern) and
 * `NotificationsModule` (the listener needs to check them before emitting)
 * can depend on the same provider without forming a cycle.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USER_NOTIFICATION_PREF_REPOSITORY,
      useClass: PrismaUserNotificationPrefRepository,
    },
  ],
  exports: [USER_NOTIFICATION_PREF_REPOSITORY],
})
export class NotificationPrefsModule {}
