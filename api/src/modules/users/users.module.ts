import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";
import { IUserRepository } from "./domain/user.repository.interface";
import { RegisterUserUseCase } from "./application/use-cases/register-user.use-case";
import { ValidateUserUseCase } from "./application/use-cases/validate-user.use-case";
import { LoginUserUseCase } from "./application/use-cases/login-user.use-case";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    LoginUserUseCase,
    {
      provide: "IUserRepository",
      useClass: PrismaUserRepository,
    },
    {
      provide: RegisterUserUseCase,
      useFactory: (repo: IUserRepository) => new RegisterUserUseCase(repo),
      inject: ["IUserRepository"],
    },
    {
      provide: ValidateUserUseCase,
      useFactory: (repo: IUserRepository) => new ValidateUserUseCase(repo),
      inject: ["IUserRepository"],
    },
  ],
  exports: [UsersService, "IUserRepository", RegisterUserUseCase, ValidateUserUseCase, LoginUserUseCase],
})
export class UsersModule {}
