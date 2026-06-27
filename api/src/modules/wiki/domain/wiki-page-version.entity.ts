import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';

export interface WikiPageVersionProps {
  pageId: string;
  revisionNo: number;
  title: string;
  content: string;
  editorId: string;
  createdAt: Date;
}

/**
 * WikiPageVersion is an append-only history row. One row is written per
 * successful page save. Pruning to 50 versions per page happens in the
 * service, transactionally with the insert.
 *
 * `revisionNo` is monotonic per `pageId` (enforced by the DB unique
 * index `WikiPageVersion_pageId_revisionNo_key`).
 */
export class WikiPageVersion extends AggregateRoot<WikiPageVersionProps> {
  get pageId(): string {
    return this.props.pageId;
  }
  get revisionNo(): number {
    return this.props.revisionNo;
  }
  get title(): string {
    return this.props.title;
  }
  get content(): string {
    return this.props.content;
  }
  get editorId(): string {
    return this.props.editorId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  private constructor(props: WikiPageVersionProps, id?: string) {
    super(props, id);
  }

  public static create(
    props: WikiPageVersionProps,
    id?: string,
  ): Result<WikiPageVersion> {
    if (!props.pageId)
      return Result.fail<WikiPageVersion>('pageId is required');
    if (!props.editorId)
      return Result.fail<WikiPageVersion>('editorId is required');
    if (props.revisionNo < 1)
      return Result.fail<WikiPageVersion>('revisionNo must be >= 1');
    if (props.title.length === 0)
      return Result.fail<WikiPageVersion>('title cannot be empty');
    return Result.ok<WikiPageVersion>(new WikiPageVersion(props, id));
  }
}
