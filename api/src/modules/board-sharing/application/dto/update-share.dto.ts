import { IsEnum, IsOptional } from 'class-validator';

export enum UpdateSharePermissionLevel {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
}

export class UpdateShareDto {
  @IsOptional()
  @IsEnum(UpdateSharePermissionLevel)
  permissionLevel?: UpdateSharePermissionLevel;
}
