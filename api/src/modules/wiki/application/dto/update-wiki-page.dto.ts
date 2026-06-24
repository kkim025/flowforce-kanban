import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWikiPageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200_000)
  content: string;

  /**
   * Optional rename. If provided and collides with an existing sibling,
   * the service auto-suffixes `-2`, `-3`, … (same rule as create).
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;
}
