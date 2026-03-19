import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSubtaskDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
