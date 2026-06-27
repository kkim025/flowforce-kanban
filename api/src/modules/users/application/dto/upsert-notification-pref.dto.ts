import { IsBoolean } from 'class-validator';

export class UpsertPrefDto {
  @IsBoolean()
  inAppEnabled!: boolean;
}
