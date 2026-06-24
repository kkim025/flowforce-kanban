import { Prisma } from '@prisma/client';
import { WikiPage } from './wiki-page.entity';
import { WikiPageVersion } from './wiki-page-version.entity';
import { WikiSpace } from './wiki-space.entity';

export const WIKI_REPOSITORY = 'WIKI_REPOSITORY';

export interface WikiTreeNode {
  page: WikiPage;
  children: WikiTreeNode[];
}

export interface TrashPage {
  page: WikiPage;
  // Pre-computed breadcrumb of where the page lived before archive.
  // `null` for root-level pages.
  breadcrumb: { id: string; title: string; slug: string }[] | null;
}

export interface IWikiRepository {
  // ── WikiSpace ────────────────────────────────────────────────────────────
  findSpaceByBoardId(
    boardId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiSpace | null>;
  saveSpace(
    space: WikiSpace,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiSpace>;

  // ── WikiPage ─────────────────────────────────────────────────────────────
  findPageById(
    pageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPage | null>;
  findPageBySlug(
    spaceId: string,
    parentId: string | null,
    slug: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPage | null>;
  findTreeBySpaceId(
    spaceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiTreeNode[]>;
  findTrashBySpaceId(
    spaceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TrashPage[]>;
  savePage(
    page: WikiPage,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPage>;
  deletePage(
    pageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  // ── WikiPageVersion ──────────────────────────────────────────────────────
  findVersionsByPageId(
    pageId: string,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPageVersion[]>;
  findVersionById(
    versionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPageVersion | null>;
  findMaxRevisionNo(
    pageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
  saveVersion(
    version: WikiPageVersion,
    tx?: Prisma.TransactionClient,
  ): Promise<WikiPageVersion>;
  /**
   * Prune a page's versions to the most recent `keep` rows. Deletes by
   * `revisionNo` so it composes cleanly with the unique index. Returns
   * the number of rows deleted.
   */
  pruneVersions(
    pageId: string,
    keep: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
}
