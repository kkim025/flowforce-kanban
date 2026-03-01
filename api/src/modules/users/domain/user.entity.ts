import { AggregateRoot } from "../../../common/domain/aggregate-root";
import { Result } from "../../../common/domain/result";
import { Email } from "./email.value-object";

export interface UserProps extends Record<string, unknown> {
  email: Email;
  password: string;
  name?: string;
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

  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  public static create(props: UserProps, id?: string): Result<User> {
    const user = new User(props, id);
    return Result.ok<User>(user);
  }
}
