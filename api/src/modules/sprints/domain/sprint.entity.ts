import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';
import { SprintStatus } from './sprint-status';

export interface SprintProps {
  name: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  boardId: string;
}

export class Sprint extends AggregateRoot<SprintProps> {
  get name(): string {
    return this.props.name;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  get status(): SprintStatus {
    return this.props.status;
  }

  get boardId(): string {
    return this.props.boardId;
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  isCompleted(): boolean {
    return this.props.status === 'COMPLETED';
  }

  isPlanning(): boolean {
    return this.props.status === 'PLANNING';
  }

  private constructor(props: SprintProps, id?: string) {
    super(props, id);
  }

  public static create(props: SprintProps, id?: string): Result<Sprint> {
    const sprint = new Sprint(props, id);
    return Result.ok<Sprint>(sprint);
  }
}