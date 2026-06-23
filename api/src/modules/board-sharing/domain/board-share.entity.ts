import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';

export type PermissionLevel = 'VIEW' | 'EDIT';
export type BoardShareStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'REVOKED'
  | 'EXPIRED';

export interface BoardShareProps {
  boardId: string;
  email: string;
  permissionLevel: PermissionLevel;
  status: BoardShareStatus;
  invitedById: string;
  inviteToken: string;
  tokenExpiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  revokedAt?: Date;
  publicId: string;
  createdAt: Date;
}

export class BoardShare extends AggregateRoot<BoardShareProps> {
  get boardId(): string {
    return this.props.boardId;
  }
  get email(): string {
    return this.props.email;
  }
  get permissionLevel(): PermissionLevel {
    return this.props.permissionLevel;
  }
  get status(): BoardShareStatus {
    return this.props.status;
  }
  get invitedById(): string {
    return this.props.invitedById;
  }
  get inviteToken(): string {
    return this.props.inviteToken;
  }
  get tokenExpiresAt(): Date {
    return this.props.tokenExpiresAt;
  }
  get acceptedAt(): Date | undefined {
    return this.props.acceptedAt;
  }
  get declinedAt(): Date | undefined {
    return this.props.declinedAt;
  }
  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }
  get publicId(): string {
    return this.props.publicId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpired(): boolean {
    return (
      this.props.status === 'PENDING' && new Date() > this.props.tokenExpiresAt
    );
  }

  isPending(): boolean {
    return this.props.status === 'PENDING';
  }

  accept(): void {
    if (this.props.status !== 'PENDING')
      throw new Error(`Cannot accept: status is ${this.props.status}`);
    if (this.isExpired()) throw new Error('Cannot accept expired share');
    this.props.status = 'ACCEPTED';
    this.props.acceptedAt = new Date();
  }

  decline(): void {
    if (this.props.status !== 'PENDING')
      throw new Error(`Cannot decline: status is ${this.props.status}`);
    this.props.status = 'DECLINED';
    this.props.declinedAt = new Date();
  }

  revoke(): void {
    if (this.props.status === 'REVOKED' || this.props.status === 'EXPIRED') {
      throw new Error(`Cannot revoke: status is ${this.props.status}`);
    }
    this.props.status = 'REVOKED';
    this.props.revokedAt = new Date();
  }

  updatePermissionLevel(level: PermissionLevel): void {
    if (this.props.status !== 'PENDING') {
      throw new Error(
        `Cannot update permission level: status is ${this.props.status}`,
      );
    }
    this.props.permissionLevel = level;
  }

  private constructor(props: BoardShareProps, id?: string) {
    super(props, id);
  }

  public static create(
    props: BoardShareProps,
    id?: string,
  ): Result<BoardShare> {
    if (!props.boardId) return Result.fail<BoardShare>('boardId is required');
    if (!props.email) return Result.fail<BoardShare>('email is required');
    if (!props.invitedById)
      return Result.fail<BoardShare>('invitedById is required');
    if (!props.inviteToken)
      return Result.fail<BoardShare>('inviteToken is required');
    if (!props.tokenExpiresAt)
      return Result.fail<BoardShare>('tokenExpiresAt is required');
    return Result.ok<BoardShare>(new BoardShare(props, id));
  }
}
