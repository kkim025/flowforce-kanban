import { Tag } from './tag.entity';

export interface ITagRepository {
  findById(id: string): Promise<Tag | null>;
  findByBoardId(boardId: string): Promise<Tag[]>;
  findByBoardIdAndName(boardId: string, name: string): Promise<Tag | null>;
  save(tag: Tag): Promise<Tag>;
  delete(id: string): Promise<void>;
}
