import { Injectable, Inject } from "@nestjs/common";
import type { IUserRepository } from "./domain/user.repository.interface";
import { User } from "./domain/user.entity";
import { UserDto } from "./application/dto/user.dto";

@Injectable()
export class UsersService {
  constructor(
    @Inject("IUserRepository")
    private userRepository: IUserRepository
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findOneById(id: string): Promise<UserDto | null> {
    const user = await this.userRepository.findById(id);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
    };
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => ({
      id: user.id,
      email: user.email.value,
      name: user.name,
    }));
  }
}
