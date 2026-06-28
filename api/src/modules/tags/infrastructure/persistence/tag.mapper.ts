import { Tag } from '../../domain/tag.entity';

type PrismaTag = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

export class TagMapper {
  static toDomain(raw: PrismaTag): Tag {
    const result = Tag.create(
      {
        boardId: raw.boardId,
        name: raw.name,
        color: raw.color,
      },
      raw.id,
    );
    // Mapper never produces an invalid entity: the schema column type for
    // color is text and we always seed with a valid hex default. Validation
    // here would be defensive in depth only.
    if (result.isFailure) {
      throw new Error(
        `TagMapper.toDomain: invalid tag in database (id=${raw.id}): ${String(
          result.error,
        )}`,
      );
    }
    return result.getValue();
  }

  static toPersistence(tag: Tag): Omit<PrismaTag, 'createdAt' | 'updatedAt'> {
    return {
      id: tag.id,
      boardId: tag.boardId,
      name: tag.name,
      color: tag.color,
    };
  }
}
