import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BoardsModule } from './modules/boards/boards.module';
import { ColumnsModule } from './modules/columns/columns.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { BoardSharingModule } from './modules/board-sharing/board-sharing.module';
import { WikiModule } from './modules/wiki/wiki.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
        const missingVars = requiredVars.filter((varName) => !config[varName]);

        if (missingVars.length > 0) {
          throw new Error(
            `Missing environment variables: ${missingVars.join(', ')}. Please check your .env file in the api folder.`,
          );
        }
        return config;
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    BoardsModule,
    ColumnsModule,
    TasksModule,
    SubtasksModule,
    ChecklistsModule,
    SprintsModule,
    NotificationsModule,
    MailModule,
    BoardSharingModule,
    WikiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
