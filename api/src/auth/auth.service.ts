import { Injectable } from "@nestjs/common";
import { RegisterUserUseCase } from "../modules/users/application/use-cases/register-user.use-case";
import { ValidateUserUseCase } from "../modules/users/application/use-cases/validate-user.use-case";
import { LoginUserUseCase } from "../modules/users/application/use-cases/login-user.use-case";
import { RegisterUserDto } from "../modules/users/application/dto/register-user.dto";
import { UserDto } from "../modules/users/application/dto/user.dto";
import { LoginResponseDto } from "../modules/users/application/dto/login-response.dto";
import { User } from "../modules/users/domain/user.entity";

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
      };
    }
    return null;
  }

  async login(userDto: UserDto): Promise<LoginResponseDto> {
    // We create a partial/mock user that satisfies the LoginUserUseCase requirement
    // or we could fetch the full entity. For performance, we'll cast carefully.
    // LoginUserUseCase needs user.id and user.email.value
    const userPayload = {
      id: userDto.id,
      email: { value: userDto.email },
      name: userDto.name,
    } as unknown as User;

    return this.loginUserUseCase.execute(userPayload);
  }

  async register(data: RegisterUserDto): Promise<LoginResponseDto> {
    const user = await this.registerUserUseCase.execute(data);
    const userDto: UserDto = {
      id: user.id,
      email: user.email.value,
      name: user.name,
    };
    return this.login(userDto);
  }
}
