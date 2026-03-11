
import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./local-auth.guard";
import { RegisterUserDto } from "../modules/users/application/dto/register-user.dto";
import { AcceptInvitationDto } from "../modules/users/application/dto/accept-invitation.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post("register")
  async register(@Body() data: RegisterUserDto) {
    return this.authService.register(data);
  }

  @Post("accept-invite")
  async acceptInvite(@Body() data: AcceptInvitationDto) {
    return this.authService.acceptInvitation(data);
  }
}
