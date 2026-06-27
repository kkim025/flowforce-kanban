import {
  Injectable,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { IUserRepository } from '../../domain/user.repository.interface';
import { RegisterUserDto } from '../dto/register-user.dto';
import { User } from '../../domain/user.entity';
import { Email } from '../../domain/email.value-object';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private userRepository: IUserRepository,
    private prisma: PrismaService,
  ) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const emailResult = Email.create(dto.email);
    if (emailResult.isFailure) {
      throw new BadRequestException(String(emailResult.error));
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Use a transaction to prevent race condition when first user registers
    const role = await this.prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count();
      return userCount === 0 ? 'ADMIN' : 'MEMBER';
    });

    const userResult = User.create({
      email: emailResult.getValue(),
      password: hashedPassword,
      name: dto.name,
      role: role,
      status: 'ACTIVE',
    });

    const user = userResult.getValue();
    await this.userRepository.save(user);

    return user;
  }
}
