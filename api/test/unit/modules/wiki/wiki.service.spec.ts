import { WikiService } from '../../../../src/modules/wiki/wiki.service';
import { FakeWikiRepository } from '../../../helpers/fake-wiki-repository';
import type { PrismaService } from '../../../../src/common/prisma/prisma.service';
import { WikiPage } from '../../../../src/modules/wiki/domain/wiki-page.entity';

/**
 * Minimal prisma mock — only `$transaction` is needed by the service.
 * We just call the callback synchronously with `undefined` because
 * `FakeWikiRepository` ignores the `tx` argument.
 */
const mockPrisma = {
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(undefined)),
} as unknown as jest.Mocked<PrismaService>;

const BOARD_ID = 'board-1';
const ACTOR = 'user-1';

describe('WikiService', () => {
  let repo: FakeWikiRepository;
  let service: WikiService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new FakeWikiRepository();
    service = new WikiService(repo, mockPrisma);
  });

  // ── Space ─────────────────────────────────────────────────────────────

  describe('getOrCreateSpace', () => {
    it('creates a space on first call', async () => {
      const space = await service.getOrCreateSpace(BOARD_ID);
      expect(space.boardId).toBe(BOARD_ID);
      // Second call returns the same space.
      const again = await service.getOrCreateSpace(BOARD_ID);
      expect(again.id).toBe(space.id);
    });
  });

  describe('getSpace', () => {
    it('throws NotFoundException when no space exists', async () => {
      await expect(service.getSpace(BOARD_ID)).rejects.toThrow(
        /Wiki not found/,
      );
    });
  });

  // ── createPage ────────────────────────────────────────────────────────

  describe('createPage', () => {
    it('creates a root page and writes version 1', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Hello',
        content: '# hello',
        actorId: ACTOR,
      });
      expect(page.title).toBe('Hello');
      expect(page.slug).toBe('hello');
      expect(page.parentId).toBeNull();
      expect(page.createdById).toBe(ACTOR);
      // Page ids must be UUIDs so they round-trip through URL paths
      // and satisfy the DTO @IsUUID validators.
      expect(page.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      const versions = await service.listVersions({
        boardId: BOARD_ID,
        pageId: page.id,
      });
      expect(versions).toHaveLength(1);
      expect(versions[0].revisionNo).toBe(1);
    });

    it('rejects a parent that belongs to a different wiki', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      await service.getOrCreateSpace('other-board');
      // Create a parent in `other-board` by switching the service's
      // notion of space — easiest way is to make the page manually.
      const otherSpace = (await repo.findSpaceByBoardId('other-board'))!;
      const foreignParent = WikiPage.create(
        {
          spaceId: otherSpace.id,
          parentId: null,
          slug: 'foreign',
          title: 'Foreign',
          content: 'x',
          order: 0,
          archived: false,
          archivedAt: null,
          archivedById: null,
          createdById: ACTOR,
          updatedById: ACTOR,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'foreign-page',
      ).getValue();
      await repo.savePage(foreignParent);

      await expect(
        service.createPage({
          boardId: BOARD_ID,
          parentId: 'foreign-page',
          title: 'Child',
          content: 'x',
          actorId: ACTOR,
        }),
      ).rejects.toThrow(/Parent page does not belong/);
    });
  });

  // ── Slug auto-suffix ──────────────────────────────────────────────────

  describe('slug auto-suffix on create', () => {
    it('auto-suffixes -2 on collision within the same parent', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Spec',
        content: 'a',
        actorId: ACTOR,
      });
      const second = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Spec',
        content: 'b',
        actorId: ACTOR,
      });
      expect(second.slug).toBe('spec-2');
    });

    it('auto-suffixes -3 after a -2 collision', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Spec',
        content: 'a',
        actorId: ACTOR,
      });
      await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Spec',
        content: 'b',
        actorId: ACTOR,
      });
      const third = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Spec',
        content: 'c',
        actorId: ACTOR,
      });
      expect(third.slug).toBe('spec-3');
    });

    it('does not auto-suffix when the same slug exists under a different parent', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const root = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Parent',
        content: 'a',
        actorId: ACTOR,
      });
      await service.createPage({
        boardId: BOARD_ID,
        parentId: root.id,
        title: 'Child',
        content: 'a',
        actorId: ACTOR,
      });
      // Sibling under a different parent — no collision.
      const sibling = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Child',
        content: 'b',
        actorId: ACTOR,
      });
      expect(sibling.slug).toBe('child');
    });
  });

  // ── updatePage ────────────────────────────────────────────────────────

  describe('updatePage', () => {
    it('appends a new version and prunes to the limit', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'P',
        content: 'a',
        actorId: ACTOR,
      });

      // 60 updates → expect 50 versions after the last save.
      for (let i = 0; i < 60; i++) {
        // eslint-disable-next-line no-await-in-loop
        await service.updatePage({
          boardId: BOARD_ID,
          pageId: page.id,
          title: 'P',
          content: `rev-${i}`,
          actorId: ACTOR,
          versionLimit: 50,
        });
      }
      const versions = await service.listVersions({
        boardId: BOARD_ID,
        pageId: page.id,
        limit: 0,
      });
      expect(versions).toHaveLength(50);
      // The newest 50 should be rev 12..61 (1 create + 60 updates = 61 total;
      // 50 keep means the oldest 11 are dropped).
      expect(versions[0].revisionNo).toBe(61);
      expect(versions[49].revisionNo).toBe(12);
    });

    it('auto-suffixes slug on rename when collision exists', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Alpha',
        content: 'a',
        actorId: ACTOR,
      });
      const target = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Beta',
        content: 'b',
        actorId: ACTOR,
      });
      const updated = await service.updatePage({
        boardId: BOARD_ID,
        pageId: target.id,
        title: 'Beta',
        content: 'b2',
        slug: 'alpha', // collides with the first page
        actorId: ACTOR,
      });
      expect(updated.slug).toBe('alpha-2');
    });

    it('keeps the original slug when renaming to itself', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Stable',
        content: 'a',
        actorId: ACTOR,
      });
      const updated = await service.updatePage({
        boardId: BOARD_ID,
        pageId: page.id,
        title: 'Stable',
        content: 'updated',
        slug: 'stable',
        actorId: ACTOR,
      });
      expect(updated.slug).toBe('stable');
    });
  });

  // ── Move + cycle guard ────────────────────────────────────────────────

  describe('movePage', () => {
    it('moves a page to a new parent', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const parent = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Parent',
        content: 'a',
        actorId: ACTOR,
      });
      const child = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Child',
        content: 'a',
        actorId: ACTOR,
      });
      const moved = await service.movePage({
        boardId: BOARD_ID,
        pageId: child.id,
        parentId: parent.id,
        order: 0,
        actorId: ACTOR,
      });
      expect(moved.parentId).toBe(parent.id);
      expect(moved.order).toBe(0);
    });

    it('refuses to make a page its own parent', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'P',
        content: 'a',
        actorId: ACTOR,
      });
      await expect(
        service.movePage({
          boardId: BOARD_ID,
          pageId: page.id,
          parentId: page.id,
          order: 0,
          actorId: ACTOR,
        }),
      ).rejects.toThrow(/its own parent/);
    });

    it('refuses to move into a descendant (cycle guard)', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const grand = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Grand',
        content: 'a',
        actorId: ACTOR,
      });
      const parent = await service.createPage({
        boardId: BOARD_ID,
        parentId: grand.id,
        title: 'Parent',
        content: 'a',
        actorId: ACTOR,
      });
      await service.createPage({
        boardId: BOARD_ID,
        parentId: parent.id,
        title: 'Child',
        content: 'a',
        actorId: ACTOR,
      });
      // Try to move `grand` under `parent` — would create a cycle.
      await expect(
        service.movePage({
          boardId: BOARD_ID,
          pageId: grand.id,
          parentId: parent.id,
          order: 0,
          actorId: ACTOR,
        }),
      ).rejects.toThrow(/descendant/);
    });
  });

  // ── Archive / restore / hard delete ──────────────────────────────────

  describe('archivePage', () => {
    it('soft-archives and is idempotent', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'P',
        content: 'a',
        actorId: ACTOR,
      });
      const archived = await service.archivePage({
        boardId: BOARD_ID,
        pageId: page.id,
        actorId: ACTOR,
      });
      expect(archived.archived).toBe(true);
      expect(archived.archivedById).toBe(ACTOR);
      expect(archived.archivedAt).not.toBeNull();

      const archivedAgain = await service.archivePage({
        boardId: BOARD_ID,
        pageId: page.id,
        actorId: ACTOR,
      });
      expect(archivedAgain.archivedAt?.toISOString()).toBe(
        archived.archivedAt?.toISOString(),
      );
    });
  });

  describe('restorePage', () => {
    it('restores from trash and clears archived metadata', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'P',
        content: 'a',
        actorId: ACTOR,
      });
      await service.archivePage({
        boardId: BOARD_ID,
        pageId: page.id,
        actorId: ACTOR,
      });
      const restored = await service.restorePage({
        boardId: BOARD_ID,
        pageId: page.id,
        actorId: ACTOR,
      });
      expect(restored.archived).toBe(false);
      expect(restored.archivedAt).toBeNull();
      expect(restored.archivedById).toBeNull();
    });

    it('keeps the original slug when no live sibling owns it', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const first = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Spec',
        content: 'a',
        actorId: ACTOR,
      });
      const second = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Spec',
        content: 'b',
        actorId: ACTOR,
      });
      expect(second.slug).toBe('spec-2');

      // Archive second, then restore. `spec-2` is free for second.
      await service.archivePage({
        boardId: BOARD_ID,
        pageId: second.id,
        actorId: ACTOR,
      });
      const restored = await service.restorePage({
        boardId: BOARD_ID,
        pageId: second.id,
        actorId: ACTOR,
      });
      expect(restored.slug).toBe('spec-2');

      // Archive first and restore. `spec` is free for first (own slug
      // excluded from collision check) → keeps `spec`.
      await service.archivePage({
        boardId: BOARD_ID,
        pageId: first.id,
        actorId: ACTOR,
      });
      const restoredFirst = await service.restorePage({
        boardId: BOARD_ID,
        pageId: first.id,
        actorId: ACTOR,
      });
      expect(restoredFirst.slug).toBe('spec');
    });
  });

  describe('hardDeletePage', () => {
    it('removes the page and cascades to versions', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'P',
        content: 'a',
        actorId: ACTOR,
      });
      await service.updatePage({
        boardId: BOARD_ID,
        pageId: page.id,
        title: 'P',
        content: 'b',
        actorId: ACTOR,
      });
      await service.hardDeletePage({
        boardId: BOARD_ID,
        pageId: page.id,
      });
      await expect(
        service.getPage(BOARD_ID, page.id),
      ).rejects.toThrow(/Wiki page not found/);
    });
  });

  // ── Versions ──────────────────────────────────────────────────────────

  describe('restoreVersion', () => {
    it('applies the historic content and appends a new version', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'P',
        content: 'v1',
        actorId: ACTOR,
      });
      await service.updatePage({
        boardId: BOARD_ID,
        pageId: page.id,
        title: 'P',
        content: 'v2',
        actorId: ACTOR,
      });
      const versions = await service.listVersions({
        boardId: BOARD_ID,
        pageId: page.id,
        limit: 0,
      });
      const v1 = versions.find((v) => v.content === 'v1')!;
      expect(v1).toBeDefined();

      const restored = await service.restoreVersion({
        boardId: BOARD_ID,
        pageId: page.id,
        versionId: v1.id,
        actorId: ACTOR,
      });
      expect(restored.content).toBe('v1');

      const after = await service.listVersions({
        boardId: BOARD_ID,
        pageId: page.id,
        limit: 0,
      });
      expect(after[0].content).toBe('v1');
      // The restore itself wrote a new version on top.
      expect(after.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Slug derivation (private method behavior, tested via create) ────

  describe('slug derivation', () => {
    it('strips diacritics, lowercases, replaces non-alphanumerics with dashes', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: 'Café — Spécial!',
        content: 'x',
        actorId: ACTOR,
      });
      expect(page.slug).toBe('cafe-special');
    });

    it('falls back to "page" when title slugifies to empty', async () => {
      await service.getOrCreateSpace(BOARD_ID);
      const page = await service.createPage({
        boardId: BOARD_ID,
        parentId: null,
        title: '!!!',
        content: 'x',
        actorId: ACTOR,
      });
      expect(page.slug).toBe('page');
    });
  });
});
