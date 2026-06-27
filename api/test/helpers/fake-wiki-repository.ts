/* eslint-disable @typescript-eslint/no-redundant-type-constituents --
   WikiPage, WikiPageVersion, WikiSpace are Result.create factories
   whose generic type parameters confuse the redundant-type-constituents
   rule. The lint warning is a false positive — these are entity
   classes, not Error instances. */
import type {
  IWikiRepository,
  WikiTreeNode,
  TrashPage,
} from '../../../src/modules/wiki/domain/wiki.repository.interface';
import { WikiPage } from '../../../src/modules/wiki/domain/wiki-page.entity';
import { WikiPageVersion } from '../../../src/modules/wiki/domain/wiki-page-version.entity';
import { WikiSpace } from '../../../src/modules/wiki/domain/wiki-space.entity';

/**
 * In-memory IWikiRepository for unit tests. Stores pages in a Map,
 * assembles tree on demand, and pretends transactions don't exist
 * (the unit-level service uses a `prisma.$transaction` shim that just
 * calls the callback — see service spec).
 */
export class FakeWikiRepository implements IWikiRepository {
  // spaceId -> WikiSpace
  private spaces = new Map<string, WikiSpace>();
  // pageId -> WikiPage
  private pages = new Map<string, WikiPage>();
  // versionId -> WikiPageVersion (indexed for findVersionById)
  private versionsById = new Map<string, WikiPageVersion>();
  // pageId -> WikiPageVersion[] (insertion order)
  private versionsByPage = new Map<string, WikiPageVersion[]>();

  // ── WikiSpace ──────────────────────────────────────────────────────────

  async findSpaceByBoardId(boardId: string): Promise<WikiSpace | null> {
    for (const s of this.spaces.values()) {
      if (s.boardId === boardId) return s;
    }
    return null;
  }

  async saveSpace(space: WikiSpace): Promise<WikiSpace> {
    this.spaces.set(space.id, space);
    return space;
  }

  // ── WikiPage ───────────────────────────────────────────────────────────

  async findPageById(pageId: string): Promise<WikiPage | null> {
    return this.pages.get(pageId) ?? null;
  }

  async findPageBySlug(
    spaceId: string,
    parentId: string | null,
    slug: string,
  ): Promise<WikiPage | null> {
    for (const p of this.pages.values()) {
      if (p.spaceId === spaceId && p.parentId === parentId && p.slug === slug) {
        return p;
      }
    }
    return null;
  }

  async findSlugsStartingWith(
    spaceId: string,
    parentId: string | null,
    baseSlug: string,
  ): Promise<{ slug: string; id: string }[]> {
    const matches: { slug: string; id: string }[] = [];
    for (const p of this.pages.values()) {
      if (
        p.spaceId === spaceId &&
        p.parentId === parentId &&
        p.slug.startsWith(baseSlug)
      ) {
        matches.push({ slug: p.slug, id: p.id });
      }
    }
    return matches;
  }

  async findTreeBySpaceId(spaceId: string): Promise<WikiTreeNode[]> {
    const live = [...this.pages.values()].filter(
      (p) => p.spaceId === spaceId && !p.archived,
    );
    const byId = new Map<string, WikiTreeNode>();
    live.forEach((p) => byId.set(p.id, { page: p, children: [] }));
    const roots: WikiTreeNode[] = [];
    live.forEach((p) => {
      const node = byId.get(p.id)!;
      if (p.parentId && byId.has(p.parentId)) {
        byId.get(p.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async findTrashBySpaceId(spaceId: string): Promise<TrashPage[]> {
    const archived = [...this.pages.values()]
      .filter((p) => p.spaceId === spaceId && p.archived)
      .sort(
        (a, b) =>
          (b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0),
      );
    return archived.map((page) => {
      const breadcrumb: { id: string; title: string; slug: string }[] = [];
      let cursor: string | null = page.parentId;
      while (cursor) {
        const parent = this.pages.get(cursor);
        if (!parent || parent.archived) break;
        breadcrumb.unshift({
          id: parent.id,
          title: parent.title,
          slug: parent.slug,
        });
        cursor = parent.parentId;
      }
      return { page, breadcrumb: breadcrumb.length ? breadcrumb : null };
    });
  }

  async savePage(page: WikiPage): Promise<WikiPage> {
    // Simulate the Prisma @@unique([spaceId, parentId, slug])
    // constraint. Without this, the test fake wouldn't exercise the
    // P2002 retry path that the real Prisma client hits on race.
    for (const existing of this.pages.values()) {
      if (
        existing.spaceId === page.spaceId &&
        existing.parentId === page.parentId &&
        existing.slug === page.slug &&
        existing.id !== page.id &&
        !existing.archived
      ) {
        const err = new Error(
          `Unique constraint failed: WikiPage (spaceId, parentId, slug)=(${page.spaceId}, ${page.parentId}, ${page.slug})`,
        ) as Error & { code: string };
        err.code = 'P2002';
        throw err;
      }
    }
    this.pages.set(page.id, page);
    return page;
  }

  async deletePage(pageId: string): Promise<void> {
    this.pages.delete(pageId);
    // Cascade: drop versions too.
    this.versionsByPage.delete(pageId);
    for (const [vid, v] of this.versionsById) {
      if (v.pageId === pageId) this.versionsById.delete(vid);
    }
  }

  // ── Versions ───────────────────────────────────────────────────────────

  async findVersionsByPageId(
    pageId: string,
    limit: number,
  ): Promise<WikiPageVersion[]> {
    const all = (this.versionsByPage.get(pageId) ?? []).slice().reverse();
    return limit > 0 ? all.slice(0, limit) : all;
  }

  async findVersionById(versionId: string): Promise<WikiPageVersion | null> {
    return this.versionsById.get(versionId) ?? null;
  }

  async findMaxRevisionNo(pageId: string): Promise<number> {
    const all = this.versionsByPage.get(pageId) ?? [];
    if (all.length === 0) return 0;
    return Math.max(...all.map((v) => v.revisionNo));
  }

  async saveVersion(version: WikiPageVersion): Promise<WikiPageVersion> {
    this.versionsById.set(version.id, version);
    const arr = this.versionsByPage.get(version.pageId) ?? [];
    arr.push(version);
    this.versionsByPage.set(version.pageId, arr);
    return version;
  }

  async pruneVersions(pageId: string, keep: number): Promise<number> {
    const arr = this.versionsByPage.get(pageId) ?? [];
    if (arr.length <= keep) return 0;
    const sorted = arr.slice().sort((a, b) => a.revisionNo - b.revisionNo);
    const toDelete = sorted.slice(0, sorted.length - keep);
    for (const v of toDelete) {
      this.versionsById.delete(v.id);
    }
    this.versionsByPage.set(pageId, sorted.slice(sorted.length - keep));
    return toDelete.length;
  }
}
