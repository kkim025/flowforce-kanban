
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

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secret",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    RegisterUserUseCase,
    ValidateUserUseCase,
    LoginUserUseCase,
    {
      provide: "IUserRepository",
      useClass: PrismaUserRepository,
    },
    // We can also alias them for convenience
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
