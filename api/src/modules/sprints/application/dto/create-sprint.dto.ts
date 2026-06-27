import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';

export class CreateSprintDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  @IsIn(['PLANNING', 'ACTIVE', 'COMPLETED'])
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED';

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsString()
  @IsNotEmpty()
  boardId: string;
}
