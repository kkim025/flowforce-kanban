import { Sprint } from './sprint.entity';

export interface ISprintRepository {
  findById(id: string): Promise<Sprint | null>;
  findByBoardId(boardId: string): Promise<Sprint[]>;
  findActiveByBoardId(boardId: string): Promise<Sprint | null>;
  save(sprint: Sprint): Promise<void>;
  delete(id: string): Promise<void>;
}
