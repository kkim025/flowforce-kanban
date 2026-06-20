import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';

export type BoardMemberRole = 'VIEWER' | 'EDITOR' | 'ADMIN';

export interface BoardMemberProps {
  boardId: string;
  userId: string;
  role: BoardMemberRole;
  publicId: string;
}

export class BoardMember extends AggregateRoot<BoardMemberProps> {
  get boardId(): string { return this.props.boardId; }
  get userId(): string { return this.props.userId; }
  get role(): BoardMemberRole { return this.props.role; }
  get publicId(): string { return this.props.publicId; }

  canEdit(): boolean {
    return this.props.role === 'EDITOR' || this.props.role === 'ADMIN';
  }

  isAdmin(): boolean {
    return this.props.role === 'ADMIN';
  }

  private constructor(props: BoardMemberProps, id?: string) {
    super(props, id);
  }

  public static create(props: BoardMemberProps, id?: string): Result<BoardMember> {
    if (!props.boardId) return Result.fail<BoardMember>('boardId is required');
    if (!props.userId) return Result.fail<BoardMember>('userId is required');
    return Result.ok<BoardMember>(new BoardMember(props, id));
  }
}
