import { IsNotEmpty, IsString } from "class-validator";

export class AddChecklistDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  taskId: string;
}
