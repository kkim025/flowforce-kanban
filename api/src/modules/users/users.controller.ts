
import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@GetUser() user: any) {
    return this.usersService.findOneById(user.id);
  }
}
