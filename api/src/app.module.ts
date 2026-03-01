import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    PrismaModule,
    AuthModule,
    UsersModule,
    BoardsModule,
    ColumnsModule,
    TasksModule,
    SubtasksModule,
    ChecklistsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
