import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(['ADMIN', 'MEMBER'])
  @IsOptional()
  role?: 'ADMIN' | 'MEMBER';
}
