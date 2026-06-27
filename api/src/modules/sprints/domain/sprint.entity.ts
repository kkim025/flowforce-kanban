import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';
import { Exclude, Expose, Transform } from 'class-transformer';
import { SprintStatus } from './sprint-status';

export interface SprintProps {
  name: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  boardId: string;
  color?: string;
}

@Exclude()
export class Sprint extends AggregateRoot<SprintProps> {
  get id(): string {
    return this._id;
  }

  @Expose()
  get name(): string {
    return this.props.name;
  }

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  get startDate(): string {
    return this.props.startDate.toISOString();
  }

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  get endDate(): string {
    return this.props.endDate.toISOString();
  }

  @Expose()
  get status(): SprintStatus {
    return this.props.status;
  }

  @Expose()
  get boardId(): string {
    return this.props.boardId;
  }

  @Expose()
  get color(): string | undefined {
    return this.props.color;
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
    if (props.color && !/^#[0-9A-Fa-f]{6}$/.test(props.color)) {
      return Result.fail<Sprint>(
        'Invalid color format. Use hex format #RRGGBB',
      );
    }
    const sprint = new Sprint(props, id);
    return Result.ok<Sprint>(sprint);
  }
}
