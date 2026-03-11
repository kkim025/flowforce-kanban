import { Injectable, Inject, ConflictException, NotFoundException } from "@nestjs/common";
import type { IUserRepository } from "./domain/user.repository.interface";
import { User } from "./domain/user.entity";
import { UserDto } from "./application/dto/user.dto";
import { InviteUserDto } from "./application/dto/invite-user.dto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class UsersService {
  constructor(
    @Inject("IUserRepository")
    private userRepository: IUserRepository,
    private prisma: PrismaService
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
      role: user.role,
      status: user.status,
    };
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => ({
      id: user.id,
      email: user.email.value,
      name: user.name,
      role: user.role,
      status: user.status,
    }));
  }

  async inviteUser(dto: InviteUserDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

    const invitation = await this.prisma.invitation.upsert({
      where: { email: dto.email },
      update: {
        token,
        role: dto.role || "MEMBER",
        expiresAt,
      },
      create: {
        email: dto.email,
        token,
        role: dto.role || "MEMBER",
        expiresAt,
      },
    });

    // TODO: In a real app, send an email here
    console.log(`Invitation sent to ${dto.email} with token ${token}`);

    return invitation;
  }

  async removeUser(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if it's the last admin
    if (user.role === "ADMIN") {
      const users = await this.userRepository.findAll();
      const adminCount = users.filter((u) => u.role === "ADMIN").length;
      if (adminCount <= 1) {
        throw new ConflictException("Cannot delete the last administrator");
      }
    }

    // Handle data dependencies (hard delete user and cascade if schema allows, 
    // but Prisma User model doesn't have onDelete: Cascade for boards/tasks by default)
    // For simplicity, we'll use Prisma directly to ensure cleanup
    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }
}
