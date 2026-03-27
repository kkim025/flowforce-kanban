import { IsString, IsOptional } from 'class-validator';

export class AssignTaskSprintDto {
  @IsString()
  @IsOptional()
  sprintId?: string | null;
}
