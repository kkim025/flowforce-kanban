import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class BoardColumnDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  order: number;
}

@Exclude()
export class BoardResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  ownerId: string;

  @Expose()
  @Type(() => BoardColumnDto)
  columns: BoardColumnDto[];

  @Expose()
  columnOrder: string[];
}
