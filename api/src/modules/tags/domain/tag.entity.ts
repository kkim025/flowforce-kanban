import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';
import { Exclude, Expose } from 'class-transformer';

export interface TagProps {
  boardId: string;
  name: string;
  color: string;
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const NAME_MAX_LEN = 32;

@Exclude()
export class Tag extends AggregateRoot<TagProps> {
  @Expose()
  get id(): string {
    return this._id;
  }

  @Expose()
  get boardId(): string {
    return this.props.boardId;
  }

  @Expose()
  get name(): string {
    return this.props.name;
  }

  @Expose()
  get color(): string {
    return this.props.color;
  }

  private constructor(props: TagProps, id?: string) {
    super(props, id);
  }

  public static create(props: TagProps, id?: string): Result<Tag> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail<Tag>('Tag name is required');
    }
    const name = props.name.trim();
    if (name.length > NAME_MAX_LEN) {
      return Result.fail<Tag>(
        `Tag name must be ${NAME_MAX_LEN} characters or fewer`,
      );
    }
    if (!HEX_COLOR_RE.test(props.color)) {
      return Result.fail<Tag>('Invalid color format. Use hex format #RRGGBB');
    }
    if (!props.boardId) {
      return Result.fail<Tag>('Tag boardId is required');
    }

    return Result.ok<Tag>(
      new Tag(
        {
          boardId: props.boardId,
          name,
          color: props.color,
        },
        id,
      ),
    );
  }
}
