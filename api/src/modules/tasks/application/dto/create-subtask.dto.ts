import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Priority } from '@prisma/client';

export class CreateSubtaskDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  checklistId!: string; // checklistId is REQUIRED — taskId-only creation is deprecated

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
