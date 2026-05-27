import { IsEnum, IsOptional } from 'class-validator';
import { BoardStatus } from '@prisma/client';

export class UpdateBoardDto {
  @IsEnum(BoardStatus)
  @IsOptional()
  status?: BoardStatus;
}
