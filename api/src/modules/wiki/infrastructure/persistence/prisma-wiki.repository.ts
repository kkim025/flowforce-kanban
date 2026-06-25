import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  IWikiRepository,
  WikiTreeNode,
  TrashPage,
} from '../../domain/wiki.repository.interface';
import { WikiPage } from '../../domain/wiki-page.entity';
import { WikiPageVersion } from '../../domain/wiki-page-version.entity';
import { WikiSpace } from '../../domain/wiki-space.entity';

@Injectable()
export class PrismaWikiRepository implements IWikiRepository {
  constructor(private prisma: PrismaService) {}

  private getClient(
    tx?: Prisma.TransactionClient,
  ): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  // ── WikiSpace ──────────────────────────────────────────────────────────────

  private rawToSpace(raw: Prisma.WikiSpaceGetPayload<object>): WikiSpace {
    return WikiSpace.create(
      {
        boardId: raw.boardId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    ).getValue();
  }

  async findSpaceByBoardId(
    boardId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiSpace | null> {
    const client = this.getClient(tx);
    const raw = await client.wikiSpace.findUnique({ where: { boardId } });
    return raw ? this.rawToSpace(raw) : null;
  }

  async saveSpace(
    space: WikiSpace,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiSpace> {
    const client = this.getClient(tx);
    const now = new Date();
    const raw = await client.wikiSpace.upsert({
      where: { id: space.id },
      create: {
        id: space.id,
        boardId: space.boardId,
        updatedAt: now,
      },
      update: {
        updatedAt: now,
      },
    });
    return this.rawToSpace(raw);
  }

  // ── WikiPage ───────────────────────────────────────────────────────────

  private rawToPage(raw: Prisma.WikiPageGetPayload<object>): WikiPage {
    return WikiPage.create(
      {
        spaceId: raw.spaceId,
        parentId: raw.parentId,
        slug: raw.slug,
        title: raw.title,
        content: raw.content,
        order: raw.order,
        archived: raw.archived,
        archivedAt: raw.archivedAt,
        archivedById: raw.archivedById,
        createdById: raw.createdById,
        updatedById: raw.updatedById,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    ).getValue();
  }

  async findPageById(
    pageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPage | null> {
    const client = this.getClient(tx);
    const raw = await client.wikiPage.findUnique({ where: { id: pageId } });
    return raw ? this.rawToPage(raw) : null;
  }

  async findPageBySlug(
    spaceId: string,
    parentId: string | null,
    slug: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPage | null> {
    const client = this.getClient(tx);
    // The unique key is (spaceId, parentId, slug), but Prisma 7's
    // generated compound-unique input type treats the nullable
    // `parentId` segment as non-null. We use `findFirst` with an
    // explicit `parentId` filter (which fully supports `null`) so the
    // query is correct on the wire.
    const raw = await client.wikiPage.findFirst({
      where: { spaceId, parentId, slug },
    });
    return raw ? this.rawToPage(raw) : null;
  }

  /**
   * Return all (slug, id) pairs within (spaceId, parentId) whose slug
   * starts with `baseSlug`. Used by slug auto-suffix to avoid the
   * 10k-round-trip loop that the previous `nextAvailableSlug`
   * implementation did.
   *
   * Note: `archived: false` is intentionally NOT included so that
   * archived siblings still block new suffixes — the unique index
   * applies to all rows regardless of archive state, so the in-memory
   * set must mirror that.
   */
  async findSlugsStartingWith(
    spaceId: string,
    parentId: string | null,
    baseSlug: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ slug: string; id: string }[]> {
    const client = this.getClient(tx);
    const raws = await client.wikiPage.findMany({
      where: {
        spaceId,
        parentId,
        slug: { startsWith: baseSlug },
      },
      select: { slug: true, id: true },
    });
    return raws.map((r) => ({ slug: r.slug, id: r.id }));
  }

  async findTreeBySpaceId(
    spaceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiTreeNode[]> {
    const client = this.getClient(tx);
    // Fetch all live pages in one query, then assemble the tree in
    // memory. Bounded by the number of pages per board (small for MVP).
    const raws = await client.wikiPage.findMany({
      where: { spaceId, archived: false },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    const pages = raws.map((r) => this.rawToPage(r));
    const byId = new Map<string, WikiTreeNode>();
    pages.forEach((p) => byId.set(p.id, { page: p, children: [] }));
    const roots: WikiTreeNode[] = [];
    pages.forEach((p) => {
      const node = byId.get(p.id)!;
      if (p.parentId && byId.has(p.parentId)) {
        byId.get(p.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async findTrashBySpaceId(
    spaceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TrashPage[]> {
    const client = this.getClient(tx);
    const raws = await client.wikiPage.findMany({
      where: { spaceId, archived: true },
      orderBy: { archivedAt: 'desc' },
    });
    // Build breadcrumb (live ancestors only) for each archived page.
    // If a parent was also archived, walk up until we find a live one
    // or hit the root.
    const results: TrashPage[] = [];
    for (const raw of raws) {
      const breadcrumb: { id: string; title: string; slug: string }[] = [];
      let cursorId: string | null = raw.parentId;
      // Bound the walk; depth is unbounded but in practice tiny.
      for (let i = 0; cursorId && i < 64; i++) {
        const parent: Prisma.WikiPageGetPayload<object> | null =
          await client.wikiPage.findUnique({ where: { id: cursorId } });
        if (!parent) break;
        // Skip archived parents — they're in trash too. Stop walking.
        // Check BEFORE unshifting so the breadcrumb doesn't include
        // an archived ancestor.
        if (parent.archived) break;
        breadcrumb.unshift({
          id: parent.id,
          title: parent.title,
          slug: parent.slug,
        });
        cursorId = parent.parentId;
      }
      results.push({
        page: this.rawToPage(raw),
        breadcrumb: breadcrumb.length > 0 ? breadcrumb : null,
      });
    }
    return results;
  }

  async savePage(
    page: WikiPage,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPage> {
    const client = this.getClient(tx);
    const now = new Date();
    const raw = await client.wikiPage.upsert({
      where: { id: page.id },
      create: {
        id: page.id,
        spaceId: page.spaceId,
        parentId: page.parentId,
        slug: page.slug,
        title: page.title,
        content: page.content,
        order: page.order,
        archived: page.archived,
        archivedAt: page.archivedAt,
        archivedById: page.archivedById,
        createdById: page.createdById,
        updatedById: page.updatedById,
        updatedAt: now,
      },
      update: {
        parentId: page.parentId,
        slug: page.slug,
        title: page.title,
        content: page.content,
        order: page.order,
        archived: page.archived,
        archivedAt: page.archivedAt,
        archivedById: page.archivedById,
        updatedById: page.updatedById,
        updatedAt: now,
      },
    });
    return this.rawToPage(raw);
  }

  async deletePage(
    pageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = this.getClient(tx);
    await client.wikiPage.delete({ where: { id: pageId } });
  }

  // ── WikiPageVersion ────────────────────────────────────────────────────────

  private rawToVersion(
    raw: Prisma.WikiPageVersionGetPayload<object>,
  ): WikiPageVersion {
    return WikiPageVersion.create(
      {
        pageId: raw.pageId,
        revisionNo: raw.revisionNo,
        title: raw.title,
        content: raw.content,
        editorId: raw.editorId,
        createdAt: raw.createdAt,
      },
      raw.id,
    ).getValue();
  }

  async findVersionsByPageId(
    pageId: string,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPageVersion[]> {
    const client = this.getClient(tx);
    const raws = await client.wikiPageVersion.findMany({
      where: { pageId },
      orderBy: { revisionNo: 'desc' },
      // `limit: 0` means "all" — we pass that through unchanged.
      ...(limit > 0 ? { take: limit } : {}),
    });
    return raws.map((r) => this.rawToVersion(r));
  }

  async findVersionById(
    versionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPageVersion | null> {
    const client = this.getClient(tx);
    const raw = await client.wikiPageVersion.findUnique({
      where: { id: versionId },
    });
    return raw ? this.rawToVersion(raw) : null;
  }

  async findMaxRevisionNo(
    pageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = this.getClient(tx);
    const top = await client.wikiPageVersion.findFirst({
      where: { pageId },
      orderBy: { revisionNo: 'desc' },
      select: { revisionNo: true },
    });
    return top?.revisionNo ?? 0;
  }

  async saveVersion(
    version: WikiPageVersion,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPageVersion> {
    const client = this.getClient(tx);
    const raw = await client.wikiPageVersion.create({
      data: {
        id: version.id,
        pageId: version.pageId,
        revisionNo: version.revisionNo,
        title: version.title,
        content: version.content,
        editorId: version.editorId,
      },
    });
    return this.rawToVersion(raw);
  }

  async pruneVersions(
    pageId: string,
    keep: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = this.getClient(tx);
    // Find the cutoff revisionNo: we keep the top `keep` by revisionNo.
    const cutoff = await client.wikiPageVersion.findFirst({
      where: { pageId },
      orderBy: { revisionNo: 'desc' },
      skip: keep - 1,
      select: { revisionNo: true },
    });
    if (!cutoff) return 0;
    const result = await client.wikiPageVersion.deleteMany({
      where: { pageId, revisionNo: { lt: cutoff.revisionNo } },
    });
    return result.count;
  }
}
