import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { IUserRepository } from '../../domain/user.repository.interface';
import { User } from '../../domain/user.entity';
import { UserMapper } from './user.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!rawUser) return null;

    return UserMapper.toDomain(rawUser);
  }

  async findById(id: string): Promise<User | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!rawUser) return null;

    return UserMapper.toDomain(rawUser);
  }

  async findAll(): Promise<User[]> {
    const rawUsers = await this.prisma.user.findMany();
    return rawUsers.map((user) => UserMapper.toDomain(user));
  }

  async save(user: User): Promise<void> {
    const persistenceUser = UserMapper.toPersistence(
      user,
    ) as Prisma.UserUpsertArgs['create'];

    await this.prisma.user.upsert({
      where: { id: user.id },
      update: persistenceUser as Prisma.UserUpdateInput,
      create: persistenceUser,
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async countByRole(role: 'ADMIN' | 'MEMBER'): Promise<number> {
    return this.prisma.user.count({ where: { role } });
  }
}
