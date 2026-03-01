import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "src/modules/users/users.service";
import { IUserRepository } from "src/modules/users/domain/user.repository.interface";
import { User } from "src/modules/users/domain/user.entity";
import { Email } from "src/modules/users/domain/email.value-object";

describe("UsersService", () => {
  let service: UsersService;
  let repository: IUserRepository;

  beforeEach(async () => {
    const mockRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: "IUserRepository", useValue: mockRepository }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<IUserRepository>("IUserRepository");
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should find user by email", async () => {
    const emailStr = "test@test.com";
    const email = Email.create(emailStr).getValue();
    const mockUser = User.create({ email, password: "hashedPassword" }, "1").getValue();
    (repository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.findOneByEmail(emailStr);
    expect(result).toBeDefined();
    expect(result?.id).toEqual("1");
    expect(result?.email.value).toEqual(emailStr);
  });
});
