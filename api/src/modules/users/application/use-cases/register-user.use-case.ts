import { Injectable, ConflictException, Inject } from "@nestjs/common";
import type { IUserRepository } from "../../domain/user.repository.interface";
import { RegisterUserDto } from "../dto/register-user.dto";
import { User } from "../../domain/user.entity";
import { Email } from "../../domain/email.value-object";
import * as bcrypt from "bcrypt";

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject("IUserRepository")
    private userRepository: IUserRepository
  ) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const emailResult = Email.create(dto.email);
    if (emailResult.isFailure) {
      throw new Error(String(emailResult.error));
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const userCount = await this.userRepository.count();
    const role = userCount === 0 ? "ADMIN" : "MEMBER";

    const userResult = User.create({
      email: emailResult.getValue(),
      password: hashedPassword,
      name: dto.name,
      role: role,
      status: "ACTIVE",
    });

    const user = userResult.getValue();
    await this.userRepository.save(user);

    return user;
  }
}
