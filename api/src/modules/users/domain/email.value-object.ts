import { ValueObject } from "../../../common/domain/value-object";
import { Result } from "../../../common/domain/result";

interface EmailProps extends Record<string, unknown> {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: EmailProps) {
    super(props);
  }

  private static isValidEmail(email: string) {
    const re = /^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  public static create(email: string): Result<Email> {
    if (!this.isValidEmail(email)) {
      return Result.fail<Email>("Email address not valid");
    } else {
      return Result.ok<Email>(new Email({ value: email }));
    }
  }
}
