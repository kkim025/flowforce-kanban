import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { IUserRepository } from './domain/user.repository.interface';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { ValidateUserUseCase } from './application/use-cases/validate-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { ListPrefsUseCase } from './application/use-cases/list-prefs.use-case';
import { UpsertPrefUseCase } from './application/use-cases/upsert-pref.use-case';
import { NotificationPrefsModule } from '../notification-prefs/notification-prefs.module';
import { USER_NOTIFICATION_PREF_REPOSITORY } from '../notification-prefs/domain/user-notification-prefs.repository.interface';
import { JwtAuthModule } from '../../auth/jwt-auth.module';

@Module({
  imports: [PrismaModule, JwtAuthModule, NotificationPrefsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    LoginUserUseCase,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    {
      provide: RegisterUserUseCase,
      useFactory: (repo: IUserRepository, prisma: PrismaService) =>
        new RegisterUserUseCase(repo, prisma),
      inject: ['IUserRepository', PrismaService],
    },
    {
      provide: ValidateUserUseCase,
      useFactory: (repo: IUserRepository) => new ValidateUserUseCase(repo),
      inject: ['IUserRepository'],
    },
    ListPrefsUseCase,
    UpsertPrefUseCase,
  ],
  exports: [
    UsersService,
    'IUserRepository',
    RegisterUserUseCase,
    ValidateUserUseCase,
    LoginUserUseCase,
    ListPrefsUseCase,
    UpsertPrefUseCase,
    // Re-export the pref repo so legacy consumers that imported it from
    // UsersModule keep working. NotificationPrefsModule is the source of truth.
    USER_NOTIFICATION_PREF_REPOSITORY,
  ],
})
export class UsersModule {}
