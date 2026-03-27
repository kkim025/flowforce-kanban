import { IsString, IsOptional, IsDateString, IsIn, Matches } from 'class-validator';

export class UpdateSprintDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PLANNING', 'ACTIVE', 'COMPLETED'])
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED';

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}
