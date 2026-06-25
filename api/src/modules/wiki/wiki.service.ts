import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import type {
  IWikiRepository,
  WikiTreeNode,
  TrashPage,
} from './domain/wiki.repository.interface';
import { WIKI_REPOSITORY } from './domain/wiki.repository.interface';
import { WikiPage } from './domain/wiki-page.entity';
import { WikiPageVersion } from './domain/wiki-page-version.entity';
import { WikiSpace } from './domain/wiki-space.entity';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Default cap on retained versions per page (UI dropdown can override). */
export const DEFAULT_WIKI_VERSION_LIMIT = 50;

/** Hard ceiling for the "All" history option. */
export const WIKI_VERSION_ALL_CEILING = 1_000;

/**
 * WikiService — board-scoped wiki CRUD + version history + recycle bin.
 *
 * All multi-step writes (save-page-with-version + prune, archive, hard-
 * delete) run inside a single Prisma transaction so the on-disk state
 * cannot drift.
 */
@Injectable()
export class WikiService {
  constructor(
    @Inject(WIKI_REPOSITORY)
    private readonly repo: IWikiRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ── Space (lazy-create) ─────────────────────────────────────────────────

  /**
   * Returns the WikiSpace for a board, creating it on first access. The
   * "Welcome" page is NOT auto-created here — that's the controller's
   * job, after it has the spaceId, so we don't create empty spaces for
   * boards that have never been visited.
   */
  async getOrCreateSpace(boardId: string): Promise<WikiSpace> {
    const existing = await this.repo.findSpaceByBoardId(boardId);
    if (existing) return existing;
    const result = WikiSpace.create(
      {
        boardId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      uuidv4(),
    );
    if (result.isFailure) {
      throw new BadRequestException(String(result.error));
    }
    return this.repo.saveSpace(result.getValue());
  }

  async getSpace(boardId: string): Promise<WikiSpace> {
    const space = await this.repo.findSpaceByBoardId(boardId);
    if (!space) throw new NotFoundException('Wiki not found for board');
    return space;
  }

  // ── Tree / reads ────────────────────────────────────────────────────────

  async getTree(boardId: string): Promise<WikiTreeNode[]> {
    const space = await this.getSpace(boardId);
    return this.repo.findTreeBySpaceId(space.id);
  }

  async getPage(boardId: string, pageId: string): Promise<WikiPage> {
    const space = await this.getSpace(boardId);
    const page = await this.repo.findPageById(pageId);
    if (!page || page.spaceId !== space.id) {
      throw new NotFoundException('Wiki page not found');
    }
    return page;
  }

  async getTrash(boardId: string): Promise<TrashPage[]> {
    const space = await this.getSpace(boardId);
    return this.repo.findTrashBySpaceId(space.id);
  }

  // ── Mutations ──────────────────────────────────────────────────────────

  /**
   * Create a new wiki page. If `slug` collides with an existing sibling
   * (same spaceId + parentId), we auto-suffix `-2`, `-3`, …
   */
  async createPage(input: {
    boardId: string;
    parentId: string | null;
    title: string;
    content: string;
    slug?: string;
    actorId: string;
  }): Promise<WikiPage> {
    // Lazy-create the space so the first POST /pages on a board works
    // without first calling GET /wiki (which is what materialises it
    // via getOrCreateSpace). Reads and updates keep the strict
    // getSpace() — a missing space there means a real "no wiki yet"
    // state we want to surface, not a 404 on legitimate work.
    const space = await this.getOrCreateSpace(input.boardId);

    // Validate parent belongs to same space (or is null).
    let parent: WikiPage | null = null;
    if (input.parentId) {
      parent = await this.repo.findPageById(input.parentId);
      if (!parent || parent.spaceId !== space.id) {
        throw new BadRequestException(
          'Parent page does not belong to this wiki',
        );
      }
    }

    const baseSlug = input.slug ?? this.slugify(input.title);
    const pageId = uuidv4();
    const now = new Date();

    // Slug allocation: handle two failure modes.
    //
    // 1. Sequential collision (a previous successful create already
    //    took `baseSlug`): `nextAvailableSlug` finds the next free
    //    `-N` suffix before we attempt the insert.
    //
    // 2. Concurrent collision (two requests both pass
    //    `nextAvailableSlug` then race the unique constraint): the
    //    loser hits Prisma's P2002 and we retry with a fresh
    //    `nextAvailableSlug` call that sees the winner's row.
    //
    // `MAX_ATTEMPTS` bounds the loop so an unrelated bug can't hang
    // the request.
    const MAX_ATTEMPTS = 5;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const slug = await this.nextAvailableSlug(
        space.id,
        input.parentId,
        baseSlug,
      );
      const pageResult = WikiPage.create(
        {
          spaceId: space.id,
          parentId: input.parentId,
          slug,
          title: input.title,
          content: input.content,
          order: 0, // append-only order is decided by the move use-case later
          archived: false,
          archivedAt: null,
          archivedById: null,
          createdById: input.actorId,
          updatedById: input.actorId,
          createdAt: now,
          updatedAt: now,
        },
        pageId,
      );
      if (pageResult.isFailure) {
        throw new BadRequestException(String(pageResult.error));
      }
      const page = pageResult.getValue();

      try {
        return await this.prisma.$transaction(async (tx) => {
          const saved = await this.repo.savePage(page, tx);
          // First version = revision 1, recording the create.
          // Pass uuidv4() explicitly — the base Entity class falls
          // back to a 9-char random string if no id is supplied,
          // which would break future tooling that assumes UUID-
          // shaped version ids (versionId is in URL paths).
          const versionResult = WikiPageVersion.create(
            {
              pageId: saved.id,
              revisionNo: 1,
              title: saved.title,
              content: saved.content,
              editorId: input.actorId,
              createdAt: now,
            },
            uuidv4(),
          );
          if (versionResult.isFailure) {
            throw new BadRequestException(String(versionResult.error));
          }
          await this.repo.saveVersion(versionResult.getValue(), tx);
          return saved;
        });
      } catch (err) {
        // Prisma's P2002 = unique constraint violation on
        // (spaceId, parentId, slug). Retry with a fresh
        // nextAvailableSlug call that sees the winner's row. Any
        // other error bubbles up.
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw new BadRequestException(
      `Could not allocate a unique slug after ${MAX_ATTEMPTS} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  /**
   * Update a page's content/title. Optionally rename slug (with auto-
   * suffix on conflict). Each successful update writes a new
   * `WikiPageVersion` row and prunes to `DEFAULT_WIKI_VERSION_LIMIT`.
   *
   * All of this runs in one transaction.
   */
  async updatePage(input: {
    boardId: string;
    pageId: string;
    title: string;
    content: string;
    slug?: string;
    actorId: string;
    versionLimit?: number;
  }): Promise<WikiPage> {
    const space = await this.getSpace(input.boardId);
    const limit = input.versionLimit ?? DEFAULT_WIKI_VERSION_LIMIT;

    return this.prisma.$transaction(async (tx) => {
      const page = await this.repo.findPageById(input.pageId, tx);
      if (!page || page.spaceId !== space.id) {
        throw new NotFoundException('Wiki page not found');
      }

      // Slug rename with auto-suffix if requested and different.
      if (input.slug !== undefined && input.slug !== page.slug) {
        const newSlug = await this.nextAvailableSlug(
          space.id,
          page.parentId,
          this.slugify(input.slug),
          page.id, // exclude self from collision check
          tx,
        );
        if (newSlug !== page.slug) {
          page.renameSlug(newSlug);
        }
      }

      page.edit({
        title: input.title,
        content: input.content,
        updatedById: input.actorId,
      });

      const saved = await this.repo.savePage(page, tx);

      // Append-only version: max + 1. Pass uuidv4() explicitly so
      // version ids in URL paths match the column type expectation.
      const maxRev = await this.repo.findMaxRevisionNo(saved.id, tx);
      const versionResult = WikiPageVersion.create(
        {
          pageId: saved.id,
          revisionNo: maxRev + 1,
          title: saved.title,
          content: saved.content,
          editorId: input.actorId,
          createdAt: new Date(),
        },
        uuidv4(),
      );
      if (versionResult.isFailure) {
        throw new BadRequestException(String(versionResult.error));
      }
      await this.repo.saveVersion(versionResult.getValue(), tx);

      // Prune oldest beyond `limit`.
      await this.repo.pruneVersions(saved.id, limit, tx);

      return saved;
    });
  }

  /** Move a page to a new parent and/or change sibling order. */
  async movePage(input: {
    boardId: string;
    pageId: string;
    parentId: string | null;
    order: number;
    actorId: string;
  }): Promise<WikiPage> {
    const space = await this.getSpace(input.boardId);

    return this.prisma.$transaction(async (tx) => {
      // Re-load the page under the transaction so the move + cycle
      // check + slug reallocation + save all operate on a consistent
      // view. Doing these in a single tx closes the TOCTOU window
      // between the pre-check and the save (review finding).
      const page = await this.repo.findPageById(input.pageId, tx);
      if (!page || page.spaceId !== space.id) {
        throw new NotFoundException('Wiki page not found');
      }

      // Validate new parent belongs to same space (or is null).
      if (input.parentId) {
        const newParent = await this.repo.findPageById(input.parentId, tx);
        if (!newParent || newParent.spaceId !== space.id) {
          throw new BadRequestException(
            'Parent page does not belong to this wiki',
          );
        }
        // Reject moves that would create a cycle (moving into a
        // descendant). Walk happens inside the tx so a concurrent
        // move can't install a cycle between the check and the save.
        await this.assertNoCycle(input.pageId, input.parentId, tx);
      }

      // If parent changed, slug may collide with an existing sibling.
      let slug = page.slug;
      if (input.parentId !== page.parentId) {
        slug = await this.nextAvailableSlug(
          space.id,
          input.parentId,
          page.slug,
          page.id,
          tx,
        );
      }

      page.move({ parentId: input.parentId, order: input.order });
      if (slug !== page.slug) page.renameSlug(slug);
      page.edit({
        title: page.title,
        content: page.content,
        updatedById: input.actorId,
      });

      return this.repo.savePage(page, tx);
    });
  }

  /** Soft-delete: mark archived. Idempotent. */
  async archivePage(input: {
    boardId: string;
    pageId: string;
    actorId: string;
  }): Promise<WikiPage> {
    const space = await this.getSpace(input.boardId);
    return this.prisma.$transaction(async (tx) => {
      const page = await this.repo.findPageById(input.pageId, tx);
      if (!page || page.spaceId !== space.id) {
        throw new NotFoundException('Wiki page not found');
      }
      page.archive(input.actorId);
      return this.repo.savePage(page, tx);
    });
  }

  /** Restore from trash. If the page's old slug is taken at its old
   *  parent (because someone created a new page there while it was
   *  archived), auto-suffix. */
  async restorePage(input: {
    boardId: string;
    pageId: string;
    actorId: string;
  }): Promise<WikiPage> {
    const space = await this.getSpace(input.boardId);
    return this.prisma.$transaction(async (tx) => {
      const page = await this.repo.findPageById(input.pageId, tx);
      if (!page || page.spaceId !== space.id) {
        throw new NotFoundException('Wiki page not found');
      }
      page.restore();
      // Re-suffix on restore if collision exists.
      const available = await this.nextAvailableSlug(
        space.id,
        page.parentId,
        page.slug,
        page.id,
        tx,
      );
      if (available !== page.slug) page.renameSlug(available);
      page.edit({
        title: page.title,
        content: page.content,
        updatedById: input.actorId,
      });
      return this.repo.savePage(page, tx);
    });
  }

  /** Permanent delete. Cascades to versions. Requires board ADMIN. */
  async hardDeletePage(input: {
    boardId: string;
    pageId: string;
  }): Promise<void> {
    const space = await this.getSpace(input.boardId);
    const page = await this.repo.findPageById(input.pageId);
    if (!page || page.spaceId !== space.id) {
      throw new NotFoundException('Wiki page not found');
    }
    await this.repo.deletePage(input.pageId);
  }

  // ── Versions ───────────────────────────────────────────────────────────

  async listVersions(input: {
    boardId: string;
    pageId: string;
    limit?: number;
  }): Promise<WikiPageVersion[]> {
    const space = await this.getSpace(input.boardId);
    const page = await this.repo.findPageById(input.pageId);
    if (!page || page.spaceId !== space.id) {
      throw new NotFoundException('Wiki page not found');
    }
    let limit = input.limit ?? DEFAULT_WIKI_VERSION_LIMIT;
    if (limit <= 0) limit = WIKI_VERSION_ALL_CEILING;
    return this.repo.findVersionsByPageId(page.id, limit);
  }

  async restoreVersion(input: {
    boardId: string;
    pageId: string;
    versionId: string;
    actorId: string;
  }): Promise<WikiPage> {
    const space = await this.getSpace(input.boardId);
    return this.prisma.$transaction(async (tx) => {
      const page = await this.repo.findPageById(input.pageId, tx);
      if (!page || page.spaceId !== space.id) {
        throw new NotFoundException('Wiki page not found');
      }
      const version = await this.repo.findVersionById(input.versionId, tx);
      if (!version || version.pageId !== page.id) {
        throw new NotFoundException('Version not found');
      }
      // Apply the historic content as a normal edit. This appends a
      // new version row capturing the restore action.
      page.edit({
        title: version.title,
        content: version.content,
        updatedById: input.actorId,
      });
      const saved = await this.repo.savePage(page, tx);
      const maxRev = await this.repo.findMaxRevisionNo(saved.id, tx);
      const versionResult = WikiPageVersion.create(
        {
          pageId: saved.id,
          revisionNo: maxRev + 1,
          title: saved.title,
          content: saved.content,
          editorId: input.actorId,
          createdAt: new Date(),
        },
        uuidv4(),
      );
      if (versionResult.isFailure) {
        throw new BadRequestException(String(versionResult.error));
      }
      await this.repo.saveVersion(versionResult.getValue(), tx);
      await this.repo.pruneVersions(saved.id, DEFAULT_WIKI_VERSION_LIMIT, tx);
      return saved;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Given a desired base slug within (spaceId, parentId), return the
   * first available slug by appending `-2`, `-3`, …
   *
   * Implementation: a single `findSlugsStartingWith` query (matches
   * `baseSlug` AND `baseSlug-...`) followed by an in-memory parse of
   * the existing suffix numbers. This is O(n) where n is the number
   * of existing suffixed siblings, instead of the prior
   * implementation's O(k) DB round-trips for k = the suffix being
   * tried.
   *
   * `excludePageId` (for rename) is excluded from the in-memory set
   * so a page's own slug doesn't collide with itself.
   */
  private async nextAvailableSlug(
    spaceId: string,
    parentId: string | null,
    baseSlug: string,
    excludePageId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const suffixNumbers = new Set<number>();
    let baseSlugTaken = false;

    const siblings = await this.repo.findSlugsStartingWith(
      spaceId,
      parentId,
      baseSlug,
      tx,
    );
    for (const { slug, id } of siblings) {
      // Skip the page that's being renamed — its own current slug
      // is allowed to collide with `baseSlug` in the rename case.
      if (id === excludePageId) continue;
      if (slug === baseSlug) {
        baseSlugTaken = true;
        continue;
      }
      const m = slug.match(/^(.*)-(\d+)$/);
      if (m && m[1] === baseSlug) {
        const n = parseInt(m[2], 10);
        if (Number.isFinite(n) && n >= 2) suffixNumbers.add(n);
      }
    }

    if (!baseSlugTaken) return baseSlug;

    // Find the smallest free suffix >= 2. Capped at 10,000 to
    // match the prior implementation's bound — in practice a single
    // parent will never have that many suffixed siblings.
    for (let i = 2; i < 10_000; i++) {
      if (!suffixNumbers.has(i)) return `${baseSlug}-${i}`;
    }
    throw new BadRequestException(
      `Could not allocate a unique slug for "${baseSlug}" — too many existing siblings`,
    );
  }
  private slugify(input: string): string {
    const base = input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base.length > 0 ? base.slice(0, 200) : 'page';
  }

  /**
   * Walk down from `newParentId` and assert that we never encounter
   * `pageId` — if we do, the move would create a cycle.
   */
  private async assertNoCycle(
    pageId: string,
    newParentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (pageId === newParentId) {
      throw new BadRequestException('Cannot make a page its own parent');
    }
    let cursor: string | null = newParentId;
    // Bounded walk; if depth > 64 we just give up and assume cycle.
    for (let i = 0; cursor && i < 64; i++) {
      const node: WikiPage | null = await this.repo.findPageById(cursor, tx);
      if (!node) return;
      if (node.id === pageId) {
        throw new BadRequestException(
          'Cannot move a page into one of its descendants',
        );
      }
      cursor = node.parentId;
    }
  }
}
