import { AggregateRoot } from "../../../common/domain/aggregate-root";
import { Result } from "../../../common/domain/result";
import { Column } from "./column.entity";

export interface BoardProps extends Record<string, unknown> {
  title: string;
  ownerId: string;
  columns?: Column[];
}

export class Board extends AggregateRoot<BoardProps> {
  get title(): string {
    return this.props.title;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get columns(): Column[] {
    return this.props.columns || [];
  }

  get columnOrder(): string[] {
    return this.columns.map(c => c.id);
  }

  private constructor(props: BoardProps, id?: string) {
    super(props, id);
  }

  public static create(props: BoardProps, id?: string): Result<Board> {
    if (!props.title) {
      return Result.fail<Board>("Board title is required");
    }
    if (!props.ownerId) {
      return Result.fail<Board>("Board ownerId is required");
    }

    const board = new Board(
      {
        ...props,
        columns: props.columns ? [...props.columns].sort((a, b) => a.order - b.order) : [],
      },
      id
    );

    return Result.ok<Board>(board);
  }

  public addColumn(column: Column): void {
    const columns = this.columns;
    columns.push(column);
    this.props.columns = columns.sort((a, b) => a.order - b.order);
  }
}
