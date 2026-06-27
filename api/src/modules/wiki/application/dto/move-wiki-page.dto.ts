import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class MoveWikiPageDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsInt()
  @Min(0)
  order: number;
}
