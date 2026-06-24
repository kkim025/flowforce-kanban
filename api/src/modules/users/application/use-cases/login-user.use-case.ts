import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/user.entity';
import { LoginResponseDto } from '../dto/login-response.dto';

@Injectable()
export class LoginUserUseCase {
  constructor(private jwtService: JwtService) {}

  async execute(user: User): Promise<LoginResponseDto> {
    const payload = { email: user.email.value, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email.value,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  }
}
