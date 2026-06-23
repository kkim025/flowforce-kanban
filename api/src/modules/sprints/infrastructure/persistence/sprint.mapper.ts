import { Sprint } from '../../domain/sprint.entity';
import { SprintStatus } from '../../domain/sprint-status';

type PrismaSprint = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  boardId: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class SprintMapper {
  static toDomain(raw: PrismaSprint): Sprint {
    const result = Sprint.create(
      {
        name: raw.name,
        startDate: raw.startDate,
        endDate: raw.endDate,
        status: raw.status,
        boardId: raw.boardId,
        color: raw.color || undefined,
      },
      raw.id,
    );
    return result.getValue();
  }

  static toPersistence(
    sprint: Sprint,
  ): Omit<PrismaSprint, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: sprint.name,
      startDate: sprint.props.startDate,
      endDate: sprint.props.endDate,
      status: sprint.status,
      boardId: sprint.boardId,
      color: sprint.color || null,
    };
  }
}
