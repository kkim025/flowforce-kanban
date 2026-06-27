import { WikiPage } from '../../../../src/modules/wiki/domain/wiki-page.entity';

const baseProps = {
  spaceId: 'space-1',
  parentId: null as string | null,
  slug: 'hello-world',
  title: 'Hello world',
  content: '# hello',
  order: 0,
  archived: false,
  archivedAt: null as Date | null,
  archivedById: null as string | null,
  createdById: 'user-1',
  updatedById: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('WikiPage', () => {
  describe('create', () => {
    it('creates a valid page', () => {
      const r = WikiPage.create(baseProps, 'page-1');
      expect(r.isSuccess).toBe(true);
      const page = r.getValue();
      expect(page.id).toBe('page-1');
      expect(page.slug).toBe('hello-world');
      expect(page.archived).toBe(false);
    });

    it('rejects when spaceId is missing', () => {
      const r = WikiPage.create({ ...baseProps, spaceId: '' }, 'p');
      expect(r.isFailure).toBe(true);
    });

    it('rejects when title is empty', () => {
      const r = WikiPage.create({ ...baseProps, title: '' }, 'p');
      expect(r.isFailure).toBe(true);
    });

    it('rejects when content is empty', () => {
      const r = WikiPage.create({ ...baseProps, content: '' }, 'p');
      expect(r.isFailure).toBe(true);
    });
  });

  describe('archive / restore', () => {
    it('archive is idempotent', () => {
      const page = WikiPage.create(baseProps, 'p').getValue();
      page.archive('archiver-1', new Date('2026-02-01'));
      page.archive('archiver-2', new Date('2026-02-02'));
      // First archive wins — second is a no-op.
      expect(page.archived).toBe(true);
      expect(page.archivedById).toBe('archiver-1');
      expect(page.archivedAt?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    });

    it('restore is idempotent on live pages', () => {
      const page = WikiPage.create(baseProps, 'p').getValue();
      page.restore();
      expect(page.archived).toBe(false);
      expect(page.archivedAt).toBeNull();
    });

    it('archive → restore roundtrip clears archived metadata', () => {
      const page = WikiPage.create(baseProps, 'p').getValue();
      page.archive('archiver-1', new Date('2026-02-01'));
      page.restore(new Date('2026-02-02'));
      expect(page.archived).toBe(false);
      expect(page.archivedAt).toBeNull();
      expect(page.archivedById).toBeNull();
      expect(page.updatedAt.toISOString()).toBe('2026-02-02T00:00:00.000Z');
    });
  });

  describe('edit / move / renameSlug', () => {
    it('edit updates title, content, updatedById, updatedAt', () => {
      const page = WikiPage.create(baseProps, 'p').getValue();
      page.edit({
        title: 'New',
        content: 'new body',
        updatedById: 'editor-2',
        now: new Date('2026-03-01'),
      });
      expect(page.title).toBe('New');
      expect(page.content).toBe('new body');
      expect(page.updatedById).toBe('editor-2');
      expect(page.updatedAt.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });

    it('move changes parent and order', () => {
      const page = WikiPage.create(baseProps, 'p').getValue();
      page.move({ parentId: 'parent-1', order: 5 });
      expect(page.parentId).toBe('parent-1');
      expect(page.order).toBe(5);
    });

    it('renameSlug updates slug', () => {
      const page = WikiPage.create(baseProps, 'p').getValue();
      page.renameSlug('renamed');
      expect(page.slug).toBe('renamed');
    });
  });
});
