import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';
import { Email } from './email.value-object';

export type UserRole = 'ADMIN' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE';

export interface UserProps extends Record<string, unknown> {
  email: Email;
  password: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
}

export class User extends AggregateRoot<UserProps> {
  get email(): Email {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  get name(): string | undefined {
    return this.props.name;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  public static create(props: UserProps, id?: string): Result<User> {
    const user = new User(props, id);
    return Result.ok<User>(user);
  }
}
