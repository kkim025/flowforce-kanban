import { Entity } from '../../../common/domain/entity';
import { Result } from '../../../common/domain/result';

interface SubtaskProps {
  content: string;
  completed: boolean;
}

export class Subtask extends Entity<SubtaskProps> {
  get content(): string {
    return this.props.content;
  }

  get completed(): boolean {
    return this.props.completed;
  }

  private constructor(props: SubtaskProps, id?: string) {
    super(props, id);
  }

  public static create(props: SubtaskProps, id?: string): Result<Subtask> {
    if (!props.content) {
      return Result.fail<Subtask>('Subtask content is required');
    }
    return Result.ok<Subtask>(new Subtask(props, id));
  }

  public toggle(): void {
    this.props.completed = !this.props.completed;
  }

  public update(props: Partial<SubtaskProps>): void {
    if (props.content !== undefined) this.props.content = props.content;
    if (props.completed !== undefined) this.props.completed = props.completed;
  }
}
