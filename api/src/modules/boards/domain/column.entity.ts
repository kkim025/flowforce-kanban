import { Entity } from '../../../common/domain/entity';
import { Result } from '../../../common/domain/result';

export interface ColumnProps extends Record<string, unknown> {
  title: string;
  order: number;
}

export class Column extends Entity<ColumnProps> {
  get title(): string {
    return this.props.title;
  }

  get order(): number {
    return this.props.order;
  }

  private constructor(props: ColumnProps, id?: string) {
    super(props, id);
  }

  public static create(props: ColumnProps, id?: string): Result<Column> {
    if (!props.title) {
      return Result.fail<Column>('Column title is required');
    }
    return Result.ok<Column>(new Column(props, id));
  }

  public updateOrder(order: number): void {
    this.props.order = order;
  }
}
