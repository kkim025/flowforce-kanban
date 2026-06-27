import { IsString, IsArray, ArrayNotEmpty, IsNotEmpty } from 'class-validator';

export class ReorderSubtasksDto {
  @IsString()
  @IsNotEmpty()
  checklistId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds!: string[];
}
