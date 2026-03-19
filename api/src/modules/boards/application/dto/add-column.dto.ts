import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AddColumnDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  order: number;

  @IsString()
  @IsNotEmpty()
  boardId: string;
}
