import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

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
}
