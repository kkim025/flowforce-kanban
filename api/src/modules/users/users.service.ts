import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { IUserRepository } from './domain/user.repository.interface';
import { User } from './domain/user.entity';
import { UserDto } from './application/dto/user.dto';
import { InviteUserDto } from './application/dto/invite-user.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private userRepository: IUserRepository,
    private prisma: PrismaService,
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
      throw new ConflictException('User already exists');
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

    const invitation = await this.prisma.invitation.upsert({
      where: { email: dto.email },
      update: {
        token,
        role: dto.role || 'MEMBER',
        expiresAt,
      },
      create: {
        email: dto.email,
        token,
        role: dto.role || 'MEMBER',
        expiresAt,
      },
    });

    // TODO: Send invitation email to dto.email with token

    return invitation;
  }

  async removeUser(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if it's the last admin
    if (user.role === 'ADMIN') {
      const adminCount = await this.userRepository.countByRole('ADMIN');
      if (adminCount <= 1) {
        throw new ConflictException('Cannot delete the last administrator');
      }
    }

    // Check for boards owned by this user
    const boards = await this.prisma.board.findMany({ where: { ownerId: id } });
    if (boards.length > 0) {
      throw new ConflictException(
        'Cannot delete user who owns boards. Please transfer or delete the boards first.',
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }

  async updateUserRole(id: string, role: 'ADMIN' | 'MEMBER') {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If demoting an admin, check if it's the last one
    if (user.role === 'ADMIN' && role === 'MEMBER') {
      const adminCount = await this.userRepository.countByRole('ADMIN');
      if (adminCount <= 1) {
        throw new ConflictException('Cannot demote the last administrator');
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    return { success: true };
  }
}
