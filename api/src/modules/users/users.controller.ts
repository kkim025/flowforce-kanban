import { Controller, Get, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { UserDto } from "./application/dto/user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@GetUser() user: { id: string }): Promise<UserDto | null> {
    return this.usersService.findOneById(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<UserDto[]> {
    return this.usersService.findAll();
  }
}
