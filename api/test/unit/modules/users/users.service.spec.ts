import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from 'src/modules/users/users.service';
import { IUserRepository } from 'src/modules/users/domain/user.repository.interface';
import { User } from 'src/modules/users/domain/user.entity';
import { Email } from 'src/modules/users/domain/email.value-object';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repository: IUserRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      countByRole: jest.fn(),
    };

    const mockPrisma = {
      invitation: {
        upsert: jest.fn(),
      },
      user: {
        delete: jest.fn(),
        update: jest.fn(),
      },
      board: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: 'IUserRepository', useValue: mockRepository },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<IUserRepository>('IUserRepository');
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find user by email', async () => {
    const emailStr = 'test@test.com';
    const email = Email.create(emailStr).getValue();
    const mockUser = User.create(
      {
        email,
        password: 'hashedPassword',
        role: 'MEMBER',
        status: 'ACTIVE',
      },
      '1',
    ).getValue();
    (repository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.findOneByEmail(emailStr);
    expect(result).toBeDefined();
    expect(result?.id).toEqual('1');
    expect(result?.email.value).toEqual(emailStr);
  });

  describe('inviteUser', () => {
    it('should throw ConflictException if user already exists', async () => {
      const emailStr = 'existing@test.com';
      const email = Email.create(emailStr).getValue();
      const mockUser = User.create({
        email,
        password: 'hashedPassword',
        role: 'MEMBER',
        status: 'ACTIVE',
      }).getValue();
      (repository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.inviteUser({ email: emailStr })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create an invitation if user does not exist', async () => {
      const emailStr = 'new@test.com';
      (repository.findByEmail as jest.Mock).mockResolvedValue(null);
      (prisma.invitation.upsert as jest.Mock).mockResolvedValue({
        email: emailStr,
        token: 'token',
      });

      const result = await service.inviteUser({
        email: emailStr,
        role: 'ADMIN',
      });
      expect(result).toBeDefined();
      expect(prisma.invitation.upsert).toHaveBeenCalled();
    });
  });

  describe('removeUser', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.removeUser('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when trying to delete the last admin', async () => {
      const email = Email.create('admin@test.com').getValue();
      const mockAdmin = User.create(
        {
          email,
          password: 'hashedPassword',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        'admin-1',
      ).getValue();

      (repository.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (repository.countByRole as jest.Mock).mockResolvedValue(1);

      await expect(service.removeUser('admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should delete user if not the last admin', async () => {
      const email = Email.create('user@test.com').getValue();
      const mockUser = User.create(
        {
          email,
          password: 'hashedPassword',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        'user-1',
      ).getValue();

      (repository.findById as jest.Mock).mockResolvedValue(mockUser);
      (prisma.board.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'user-1' });

      const result = await service.removeUser('user-1');
      expect(result.success).toBe(true);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('updateUserRole', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateUserRole('non-existent', 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when trying to demote last admin', async () => {
      const email = Email.create('admin@test.com').getValue();
      const mockAdmin = User.create(
        {
          email,
          password: 'hashedPassword',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        'admin-1',
      ).getValue();

      (repository.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (repository.countByRole as jest.Mock).mockResolvedValue(1);

      await expect(service.updateUserRole('admin-1', 'MEMBER')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update user role successfully', async () => {
      const email = Email.create('user@test.com').getValue();
      const mockUser = User.create(
        {
          email,
          password: 'hashedPassword',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        'user-1',
      ).getValue();

      (repository.findById as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN',
      });

      const result = await service.updateUserRole('user-1', 'ADMIN');
      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'ADMIN' },
      });
    });

    it('should allow demoting admin when there are other admins', async () => {
      const email = Email.create('admin@test.com').getValue();
      const mockAdmin = User.create(
        {
          email,
          password: 'hashedPassword',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        'admin-1',
      ).getValue();

      (repository.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (repository.countByRole as jest.Mock).mockResolvedValue(2);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        role: 'MEMBER',
      });

      const result = await service.updateUserRole('admin-1', 'MEMBER');
      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        data: { role: 'MEMBER' },
      });
    });

    it('should allow updating member to same role (no-op)', async () => {
      const email = Email.create('user@test.com').getValue();
      const mockUser = User.create(
        {
          email,
          password: 'hashedPassword',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        'user-1',
      ).getValue();

      (repository.findById as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        role: 'MEMBER',
      });

      const result = await service.updateUserRole('user-1', 'MEMBER');
      expect(result.success).toBe(true);
    });
  });
});
