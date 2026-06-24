import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';
import { ListPrefsUseCase } from 'src/modules/users/application/use-cases/list-prefs.use-case';
import { UpsertPrefUseCase } from 'src/modules/users/application/use-cases/upsert-pref.use-case';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;
  let mockListPrefs: { execute: jest.Mock };
  let mockUpsertPref: { execute: jest.Mock };

  beforeEach(async () => {
    mockUsersService = {};
    mockListPrefs = { execute: jest.fn() };
    mockUpsertPref = { execute: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: ListPrefsUseCase, useValue: mockListPrefs },
        { provide: UpsertPrefUseCase, useValue: mockUpsertPref },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards getNotificationPrefs to ListPrefsUseCase', async () => {
    mockListPrefs.execute.mockResolvedValue([]);
    await controller.getNotificationPrefs('u1');
    expect(mockListPrefs.execute).toHaveBeenCalledWith('u1');
  });

  it('forwards upsertNotificationPref to UpsertPrefUseCase', async () => {
    mockUpsertPref.execute.mockResolvedValue({});
    await controller.upsertNotificationPref('u1', 'ASSIGNMENT', {
      inAppEnabled: false,
    });
    expect(mockUpsertPref.execute).toHaveBeenCalledWith(
      'u1',
      'ASSIGNMENT',
      false,
    );
  });
});
