import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";
import { Priority } from "../../domain/task.entity";

export class CreateTaskDto {
  @IsString()
  @IsOptional()
  @IsUUID()
  id?: string;

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
