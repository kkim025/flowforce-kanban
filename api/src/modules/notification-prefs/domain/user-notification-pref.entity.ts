import { Entity } from '../../../common/domain/entity';
import { Result } from '../../../common/domain/result';
import { NotificationType } from '../../notifications/domain/notification-type.value-object';

export interface UserNotificationPrefProps {
  userId: string;
  type: NotificationType;
  inAppEnabled: boolean;
}

export class UserNotificationPref extends Entity<UserNotificationPrefProps> {
  private constructor(props: UserNotificationPrefProps, id?: string) {
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get inAppEnabled(): boolean {
    return this.props.inAppEnabled;
  }

  public static create(
    props: UserNotificationPrefProps,
    id?: string,
  ): Result<UserNotificationPref> {
    if (!props.userId) {
      return Result.fail<UserNotificationPref>(
        'UserNotificationPref userId is required',
      );
    }
    if (!props.type) {
      return Result.fail<UserNotificationPref>(
        'UserNotificationPref type is required',
      );
    }

    return Result.ok<UserNotificationPref>(
      new UserNotificationPref(
        {
          ...props,
          inAppEnabled:
            props.inAppEnabled !== undefined ? props.inAppEnabled : true,
        },
        id,
      ),
    );
  }

  public setEnabled(enabled: boolean): void {
    this.props.inAppEnabled = enabled;
  }
}
