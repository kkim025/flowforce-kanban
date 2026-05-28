import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BoardStatus } from '@prisma/client';

export class UpdateBoardDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsEnum(BoardStatus)
  @IsOptional()
  status?: BoardStatus;
}
