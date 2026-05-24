import {
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
} from 'class-validator';
import { Priority } from '@prisma/client';

export class UpdateSubtaskDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority | null; // null = inherit from parent task
}
