import { Injectable } from "@nestjs/common";
import { RegisterUserUseCase } from "../modules/users/application/use-cases/register-user.use-case";
import { ValidateUserUseCase } from "../modules/users/application/use-cases/validate-user.use-case";
import { LoginUserUseCase } from "../modules/users/application/use-cases/login-user.use-case";
import { RegisterUserDto } from "../modules/users/application/dto/register-user.dto";
import { UserDto } from "../modules/users/application/dto/user.dto";
import { LoginResponseDto } from "../modules/users/application/dto/login-response.dto";
import { User, UserRole, UserStatus } from "../modules/users/domain/user.entity";
import { Email } from "../modules/users/domain/email.value-object";

@Injectable()
export class AuthService {
  constructor(
    private registerUserUseCase: RegisterUserUseCase,
    private validateUserUseCase: ValidateUserUseCase,
    private loginUserUseCase: LoginUserUseCase
  ) {}

  async validateUser(email: string, pass: string): Promise<UserDto | null> {
    const user = await this.validateUserUseCase.execute(email, pass);
    if (user) {
      return {
        id: user.id,
        email: user.email.value,
        name: user.name,
        role: user.role,
        status: user.status,
      };
    }
    return null;
  }

  async login(userDto: UserDto): Promise<LoginResponseDto> {
    const emailResult = Email.create(userDto.email);
    if (emailResult.isFailure) {
      throw new Error("Invalid email in userDto");
    }

    const userResult = User.create(
      {
        email: emailResult.getValue(),
        password: "", // Password not needed for login token generation
        name: userDto.name,
        role: userDto.role as UserRole,
        status: userDto.status as UserStatus,
      },
      userDto.id
    );

    return this.loginUserUseCase.execute(userResult.getValue());
  }

  async register(data: RegisterUserDto): Promise<LoginResponseDto> {
    const user = await this.registerUserUseCase.execute(data);
    const userDto: UserDto = {
      id: user.id,
      email: user.email.value,
      name: user.name,
      role: user.role,
      status: user.status,
    };
    return this.login(userDto);
  }
}
