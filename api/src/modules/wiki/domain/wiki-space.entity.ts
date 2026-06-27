import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';

export interface WikiSpaceProps {
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WikiSpace is the 1:1 container of pages for a single board. In MVP
 * there is exactly one WikiSpace per Board; this entity exists mainly
 * to give us a place to hang page relations and to make the cascade
 * from Board deletion explicit.
 */
export class WikiSpace extends AggregateRoot<WikiSpaceProps> {
  get boardId(): string {
    return this.props.boardId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private constructor(props: WikiSpaceProps, id?: string) {
    super(props, id);
  }

  public static create(props: WikiSpaceProps, id?: string): Result<WikiSpace> {
    if (!props.boardId) return Result.fail<WikiSpace>('boardId is required');
    return Result.ok<WikiSpace>(new WikiSpace(props, id));
  }
}
