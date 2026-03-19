import { Board } from './board.entity';
import { Column } from './column.entity';

export interface IBoardRepository {
  findById(id: string): Promise<Board | null>;
  findAllByOwnerId(ownerId: string): Promise<Board[]>;
  save(board: Board): Promise<void>;
  delete(id: string): Promise<void>;

  // Column related if handled via Board aggregate
  findColumnById(id: string): Promise<Column | null>;
  saveColumn(boardId: string, column: Column): Promise<void>;
  deleteColumn(id: string): Promise<void>;
}
