import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';

export interface WikiPageProps {
  spaceId: string;
  parentId: string | null;
  slug: string;
  title: string;
  content: string;
  order: number;
  archived: boolean;
  archivedAt: Date | null;
  archivedById: string | null;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WikiPage is the markdown document unit in a board's WikiSpace.
 *
 * Tree structure is encoded by `parentId` (adjacency list). Slug uniqueness
 * is enforced per `(spaceId, parentId)` pair. `archived = true` is the
 * soft-delete ("recycle bin") state; `archivedAt` records when the page
 * was moved to trash so the Trash view can sort newest-first.
 */
export class WikiPage extends AggregateRoot<WikiPageProps> {
  get spaceId(): string {
    return this.props.spaceId;
  }
  get parentId(): string | null {
    return this.props.parentId;
  }
  get slug(): string {
    return this.props.slug;
  }
  get title(): string {
    return this.props.title;
  }
  get content(): string {
    return this.props.content;
  }
  get order(): number {
    return this.props.order;
  }
  get archived(): boolean {
    return this.props.archived;
  }
  get archivedAt(): Date | null {
    return this.props.archivedAt;
  }
  get archivedById(): string | null {
    return this.props.archivedById;
  }
  get createdById(): string {
    return this.props.createdById;
  }
  get updatedById(): string {
    return this.props.updatedById;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Move to trash. Idempotent: archiving an already-archived page is a no-op. */
  archive(archivedById: string, now: Date = new Date()): void {
    if (this.props.archived) return;
    this.props.archived = true;
    this.props.archivedAt = now;
    this.props.archivedById = archivedById;
    this.props.updatedAt = now;
  }

  /** Restore from trash. Idempotent: restoring a live page is a no-op. */
  restore(now: Date = new Date()): void {
    if (!this.props.archived) return;
    this.props.archived = false;
    this.props.archivedAt = null;
    this.props.archivedById = null;
    this.props.updatedAt = now;
  }

  /**
   * Apply an edit. `updatedById` is required so the version row knows
   * who to credit. `slug` and `parentId` are not editable here — slug
   * changes go through the service because they may need auto-suffixing,
   * and parent changes go through `move()` because they require
   * re-keying under the new `(spaceId, parentId, slug)` unique.
   */
  edit(input: {
    title: string;
    content: string;
    updatedById: string;
    now?: Date;
  }): void {
    this.props.title = input.title;
    this.props.content = input.content;
    this.props.updatedById = input.updatedById;
    this.props.updatedAt = input.now ?? new Date();
  }

  /** Change parent and/or sibling order. Used by the move use-case. */
  move(input: { parentId: string | null; order: number; now?: Date }): void {
    this.props.parentId = input.parentId;
    this.props.order = input.order;
    this.props.updatedAt = input.now ?? new Date();
  }

  /** Apply a new slug (after auto-suffix collision handling in the service). */
  renameSlug(newSlug: string, now: Date = new Date()): void {
    this.props.slug = newSlug;
    this.props.updatedAt = now;
  }

  private constructor(props: WikiPageProps, id?: string) {
    super(props, id);
  }

  public static create(props: WikiPageProps, id?: string): Result<WikiPage> {
    if (!props.spaceId) return Result.fail<WikiPage>('spaceId is required');
    if (!props.slug) return Result.fail<WikiPage>('slug is required');
    if (!props.createdById)
      return Result.fail<WikiPage>('createdById is required');
    if (!props.updatedById)
      return Result.fail<WikiPage>('updatedById is required');
    if (props.title.length === 0)
      return Result.fail<WikiPage>('title cannot be empty');
    if (props.content.length === 0)
      return Result.fail<WikiPage>('content cannot be empty');
    return Result.ok<WikiPage>(new WikiPage(props, id));
  }
}
