import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Priority } from "../../domain/task.entity";

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsNumber()
  order: number;

  @IsString()
  @IsNotEmpty()
  columnId: string;
}
