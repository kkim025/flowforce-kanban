import { Entity } from '../../../common/domain/entity';
import { Result } from '../../../common/domain/result';
import { Subtask } from './subtask.entity';

export interface ChecklistProps extends Record<string, unknown> {
  title: string;
  items?: Subtask[];
}

export class Checklist extends Entity<ChecklistProps> {
  get title(): string {
    return this.props.title;
  }

  get items(): Subtask[] {
    return this.props.items || [];
  }

  private constructor(props: ChecklistProps, id?: string) {
    super(props, id);
  }

  public static create(props: ChecklistProps, id?: string): Result<Checklist> {
    if (!props.title) {
      return Result.fail<Checklist>('Checklist title is required');
    }
    return Result.ok<Checklist>(new Checklist(props, id));
  }

  public addItem(item: Subtask): void {
    const items = this.items;
    items.push(item);
    this.props.items = items;
  }
}
