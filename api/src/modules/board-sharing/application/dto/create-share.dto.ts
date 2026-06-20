import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum CreateSharePermissionLevel {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
}

export class CreateShareDto {
  @IsEmail()
  email: string;

  @IsEnum(CreateSharePermissionLevel)
  permissionLevel: CreateSharePermissionLevel;

  @IsOptional()
  @IsString()
  message?: string;
}
