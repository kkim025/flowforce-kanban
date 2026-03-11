import { Injectable, UnauthorizedException, NotFoundException } from "@nestjs/common";
import { RegisterUserUseCase } from "../modules/users/application/use-cases/register-user.use-case";
import { ValidateUserUseCase } from "../modules/users/application/use-cases/validate-user.use-case";
import { LoginUserUseCase } from "../modules/users/application/use-cases/login-user.use-case";
import { RegisterUserDto } from "../modules/users/application/dto/register-user.dto";
import { UserDto } from "../modules/users/application/dto/user.dto";
import { LoginResponseDto } from "../modules/users/application/dto/login-response.dto";
import { AcceptInvitationDto } from "../modules/users/application/dto/accept-invitation.dto";
import { User } from "../modules/users/domain/user.entity";
import { Email } from "../modules/users/domain/email.value-object";
import { PrismaService } from "../common/prisma/prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private registerUserUseCase: RegisterUserUseCase,
    private validateUserUseCase: ValidateUserUseCase,
    private loginUserUseCase: LoginUserUseCase,
    private prisma: PrismaService
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
        role: userDto.role as any,
        status: userDto.status as any,
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

  async acceptInvitation(dto: AcceptInvitationDto): Promise<LoginResponseDto> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) {
      throw new NotFoundException("Invalid or expired invitation token");
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.delete({ where: { token: dto.token } });
      throw new UnauthorizedException("Invitation token has expired");
    }

    const emailResult = Email.create(invitation.email);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const userResult = User.create({
      email: emailResult.getValue(),
      password: hashedPassword,
      name: dto.name,
      role: invitation.role,
      status: "ACTIVE",
    });

    const user = userResult.getValue();

    // Save user and delete invitation in a transaction
    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email.value,
          password: user.password,
          name: user.name,
          role: user.role,
          status: "ACTIVE",
        },
      }),
      this.prisma.invitation.delete({
        where: { id: invitation.id },
      }),
    ]);

    return this.login({
      id: user.id,
      email: user.email.value,
      name: user.name,
      role: user.role,
      status: "ACTIVE",
    });
  }
}

