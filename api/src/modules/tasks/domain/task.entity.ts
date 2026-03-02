import { AggregateRoot } from "../../../common/domain/aggregate-root";
import { Result } from "../../../common/domain/result";
import { Checklist } from "./checklist.entity";
import { Subtask } from "./subtask.entity";

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export interface TaskProps extends Record<string, unknown> {
  content: string;
  description?: string;
  priority: Priority;
  order: number;
  columnId: string;
  archived?: boolean;
  assigneeId?: string;
  checklists?: Checklist[];
  subtasks?: Subtask[];
}

export class Task extends AggregateRoot<TaskProps> {
  get content(): string {
    return this.props.content;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get priority(): Priority {
    return this.props.priority;
  }

  get order(): number {
    return this.props.order;
  }

  get columnId(): string {
    return this.props.columnId;
  }

  get archived(): boolean {
    return this.props.archived || false;
  }

  get assigneeId(): string | undefined {
    return this.props.assigneeId;
  }

  get checklists(): Checklist[] {
    return this.props.checklists || [];
  }

  get subtasks(): Subtask[] {
    return this.props.subtasks || [];
  }

  private constructor(props: TaskProps, id?: string) {
    super(props, id);
  }

  public static create(props: TaskProps, id?: string): Result<Task> {
    if (!props.content) {
      return Result.fail<Task>("Task content is required");
    }
    if (!props.columnId) {
      return Result.fail<Task>("Task columnId is required");
    }

    const task = new Task(
      {
        ...props,
        archived: props.archived || false,
        checklists: props.checklists || [],
        subtasks: props.subtasks || [],
      },
      id
    );

    return Result.ok<Task>(task);
  }

  public addChecklist(checklist: Checklist): void {
    const checklists = this.checklists;
    checklists.push(checklist);
    this.props.checklists = checklists;
  }

  public addSubtask(subtask: Subtask): void {
    const subtasks = this.subtasks;
    subtasks.push(subtask);
    this.props.subtasks = subtasks;
  }

  public move(columnId: string, order: number): void {
    this.props.columnId = columnId;
    this.props.order = order;
  }

  public archive(): void {
    this.props.archived = true;
  }

  public setAssignee(assigneeId: string | undefined): void {
    this.props.assigneeId = assigneeId;
  }
}
