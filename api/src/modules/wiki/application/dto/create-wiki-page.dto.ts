import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateWikiPageDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200_000)
  content: string;

  /**
   * Optional slug override. If omitted, the service derives it from
   * the title. If it collides with an existing sibling, the service
   * auto-suffixes `-2`, `-3`, …
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;
}
