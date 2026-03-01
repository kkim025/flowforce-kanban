import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "src/auth/auth.service";
import { RegisterUserUseCase } from "src/modules/users/application/use-cases/register-user.use-case";
import { ValidateUserUseCase } from "src/modules/users/application/use-cases/validate-user.use-case";
import { LoginUserUseCase } from "src/modules/users/application/use-cases/login-user.use-case";
import { User } from "src/modules/users/domain/user.entity";
import { Email } from "src/modules/users/domain/email.value-object";

describe("AuthService", () => {
  let service: AuthService;
  let registerUserUseCase: jest.Mocked<RegisterUserUseCase>;
  let validateUserUseCase: jest.Mocked<ValidateUserUseCase>;
  let loginUserUseCase: jest.Mocked<LoginUserUseCase>;

  beforeEach(async () => {
    const mockRegisterUserUseCase = {
      execute: jest.fn(),
    };
    const mockValidateUserUseCase = {
      execute: jest.fn(),
    };
    const mockLoginUserUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RegisterUserUseCase, useValue: mockRegisterUserUseCase },
        { provide: ValidateUserUseCase, useValue: mockValidateUserUseCase },
        { provide: LoginUserUseCase, useValue: mockLoginUserUseCase },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    registerUserUseCase = module.get(RegisterUserUseCase);
    validateUserUseCase = module.get(ValidateUserUseCase);
    loginUserUseCase = module.get(LoginUserUseCase);
  });

  describe("validateUser", () => {
    it("should return userDto if credentials are valid", async () => {
      const emailStr = "test@example.com";
      const email = Email.create(emailStr).getValue();
      const mockUser = User.create({ email, password: "hashedPassword", name: "Test User" }, "user-1").getValue();

      validateUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await service.validateUser(emailStr, "password123");
      expect(result).toEqual({
        id: "user-1",
        email: emailStr,
        name: "Test User",
      });
    });

    it("should return null if validateUserUseCase returns null", async () => {
      validateUserUseCase.execute.mockResolvedValue(null);
      const result = await service.validateUser("test@example.com", "wrongpass");
      expect(result).toBeNull();
    });
  });

  describe("register", () => {
    it("should call registerUserUseCase and return login result", async () => {
      const emailStr = "test@example.com";
      const email = Email.create(emailStr).getValue();
      const mockUser = User.create({ email, password: "hashedPassword", name: "Test User" }, "user-1").getValue();

      registerUserUseCase.execute.mockResolvedValue(mockUser);
      loginUserUseCase.execute.mockResolvedValue({
        access_token: "mock-token",
        user: { id: "user-1", email: emailStr, name: "Test User" },
      });

      const result = await service.register({ email: emailStr, password: "pass", name: "Test" });

      expect(registerUserUseCase.execute).toHaveBeenCalled();
      expect(result).toHaveProperty("access_token");
      expect(result.user.id).toEqual("user-1");
    });
  });
});
