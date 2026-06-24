import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum CreateSharePermissionLevel {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
}

export class CreateShareDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail()
  email: string;

  @IsEnum(CreateSharePermissionLevel)
  permissionLevel: CreateSharePermissionLevel;

  @IsOptional()
  @IsString()
  message?: string;
}
