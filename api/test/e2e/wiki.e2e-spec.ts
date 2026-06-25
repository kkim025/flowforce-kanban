import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/common/prisma/prisma.service';
// Use the Prisma-generated enum directly because the domain entity
// exposes `BoardMemberRole` as a TS type only (no runtime values).
import { BoardMemberRole as PrismaBoardMemberRole } from '@prisma/client';

/**
 * Wiki (e2e) — full permission matrix + happy-path CRUD against a
 * real Postgres + the real Nest app. Pairs with the unit tests in
 * test/unit/modules/wiki/* (which mock the repo). This file proves
 * the wiring: JWT guard + DTO validation + permission service +
 * repo + Prisma all compose correctly.
 *
 * Setup: one board, five users (owner, VIEWER, EDITOR, ADMIN,
 * OUTSIDER). Run every meaningful wiki route against every user and
 * assert the expected status code.
 */
describe('Wiki (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Per-user JWT + id.
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  let boardId: string;
  let rootPageId: string;

  const mkUser = (label: string) => ({
    email: `wiki-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'password123',
    name: `Wiki ${label}`,
  });

  const owner = mkUser('owner');
  const viewer = mkUser('viewer');
  const editor = mkUser('editor');
  const admin = mkUser('admin');
  const outsider = mkUser('outsider');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Register each user and grab their JWT.
    for (const u of [owner, viewer, editor, admin, outsider]) {
      const label = u.name.replace('Wiki ', '').toLowerCase();
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(u);
      expect(res.status).toBeLessThan(400);
      tokens[label] = res.body.access_token;
      userIds[label] = res.body.user.id;
    }

    // Create the board owned by `owner`.
    const board = await prisma.board.create({
      data: { title: 'Wiki Test Board', ownerId: userIds.owner },
    });
    boardId = board.id;

    // Memberships: viewer/editor/admin join the board.
    await prisma.boardMember.create({
      data: {
        boardId,
        userId: userIds.viewer,
        role: PrismaBoardMemberRole.VIEWER,
        publicId: `pub-viewer-${Date.now()}`,
      },
    });
    await prisma.boardMember.create({
      data: {
        boardId,
        userId: userIds.editor,
        role: PrismaBoardMemberRole.EDITOR,
        publicId: `pub-editor-${Date.now()}`,
      },
    });
    await prisma.boardMember.create({
      data: {
        boardId,
        userId: userIds.admin,
        role: PrismaBoardMemberRole.ADMIN,
        publicId: `pub-admin-${Date.now()}`,
      },
    });
    // `outsider` has no membership row.
  });

  afterAll(async () => {
    if (boardId) {
      // Cascade: WikiPage -> WikiPageVersion is onDelete: Cascade.
      // WikiSpace cascades from Board. But we created the board
      // manually so we must clean up WikiSpace + any pages.
      await prisma.wikiPage.deleteMany({ where: { space: { boardId } } });
      await prisma.wikiSpace.deleteMany({ where: { boardId } });
      await prisma.boardMember.deleteMany({ where: { boardId } });
      await prisma.board.delete({ where: { id: boardId } });
    }
    for (const id of Object.values(userIds)) {
      // Boards / memberships were cascaded. User delete cascades the
      // remaining owned boards. WikiPages were cleaned above.
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await app.close();
  });

  // ── GET /boards/:boardId/wiki (tree) ─────────────────────────────────

  describe('GET /boards/:boardId/wiki (tree)', () => {
    it.each([
      ['owner', 200],
      ['viewer', 200],
      ['editor', 200],
      ['admin', 200],
      ['outsider', 403],
    ])('%s -> %i', async (label, expected) => {
      const res = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki`)
        .set('Authorization', `Bearer ${tokens[label]}`);
      expect(res.status).toBe(expected);
      if (expected === 200) {
        // Empty tree (we haven't created any pages yet).
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki`)
        .expect(401);
    });
  });

  // ── POST /boards/:boardId/wiki/pages ─────────────────────────────────

  describe('POST /boards/:boardId/wiki/pages', () => {
    it('editor creates a root page and writes version 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Welcome', content: '# hello' });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('welcome');
      expect(res.body.parentId).toBeNull();
      expect(res.body.archived).toBe(false);
      rootPageId = res.body.id;

      // Version 1 exists.
      const v = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${rootPageId}/versions`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(v.status).toBe(200);
      expect(v.body).toHaveLength(1);
      expect(v.body[0].revisionNo).toBe(1);
    });

    it.each([
      ['viewer', 403],
      ['outsider', 403],
    ])('%s cannot create (403)', async (label, expected) => {
      const res = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens[label]}`)
        .send({ title: 'nope', content: 'nope' });
      expect(res.status).toBe(expected);
    });

    it('rejects empty title with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: '', content: 'x' });
      expect(res.status).toBe(400);
    });
  });

  // ── GET single page ──────────────────────────────────────────────────

  describe('GET /boards/:boardId/wiki/pages/:pageId', () => {
    it('everyone with board view can read', async () => {
      for (const label of ['owner', 'viewer', 'editor', 'admin']) {
        const res = await request(app.getHttpServer())
          .get(`/boards/${boardId}/wiki/pages/${rootPageId}`)
          .set('Authorization', `Bearer ${tokens[label]}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(rootPageId);
      }
    });

    it('outsider is forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${rootPageId}`)
        .set('Authorization', `Bearer ${tokens.outsider}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for a nonexistent page', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/boards/${boardId}/wiki/pages/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(res.status).toBe(404);
    });
  });

  // ── PATCH (update) ───────────────────────────────────────────────────

  describe('PATCH /boards/:boardId/wiki/pages/:pageId', () => {
    it('editor updates the page; version 2 is appended', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/boards/${boardId}/wiki/pages/${rootPageId}`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Welcome', content: '# hello v2' });
      expect(res.status).toBe(200);
      expect(res.body.content).toBe('# hello v2');

      const v = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${rootPageId}/versions`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(v.body).toHaveLength(2);
      expect(v.body[0].revisionNo).toBe(2);
    });

    it('viewer cannot update (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/boards/${boardId}/wiki/pages/${rootPageId}`)
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ title: 'X', content: 'X' });
      expect(res.status).toBe(403);
    });

    it('version pruning keeps at most 50 versions', async () => {
      // We have 2 versions so far. Push 60 more updates to cross 50.
      for (let i = 0; i < 60; i++) {
        await request(app.getHttpServer())
          .patch(`/boards/${boardId}/wiki/pages/${rootPageId}`)
          .set('Authorization', `Bearer ${tokens.editor}`)
          .send({ title: 'Welcome', content: `rev-${i}` });
      }
      const v = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${rootPageId}/versions?limit=0`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(v.status).toBe(200);
      expect(v.body.length).toBeLessThanOrEqual(50);
      // Newest version's revisionNo should be 62 (1 create + 1 first
      // update + 60 more = 62).
      expect(v.body[0].revisionNo).toBe(62);
    }, 30_000);
  });

  // ── Move + cycle guard ───────────────────────────────────────────────

  describe('POST /boards/:boardId/wiki/pages/:pageId/move', () => {
    it('creates a child, moves it under root, refuses self-parent', async () => {
      const child = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Child', content: 'c', parentId: null });
      expect(child.status).toBe(201);

      const move = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages/${child.body.id}/move`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ parentId: rootPageId, order: 0 });
      expect(move.status).toBe(201);
      expect(move.body.parentId).toBe(rootPageId);

      // Self-parent is rejected.
      const selfParent = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages/${rootPageId}/move`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ parentId: rootPageId, order: 0 });
      expect(selfParent.status).toBe(400);
    });

    it('viewer cannot move (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages/${rootPageId}/move`)
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ parentId: null, order: 0 });
      expect(res.status).toBe(403);
    });
  });

  // ── Slug auto-suffix on collision ────────────────────────────────────

  describe('slug auto-suffix', () => {
    it('appends -2 on same-title create under same parent', async () => {
      const a = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Spec', content: 'a' });
      const b = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Spec', content: 'b' });
      expect(a.body.slug).toBe('spec');
      expect(b.body.slug).toBe('spec-2');
    });
  });

  // ── Archive / Trash ──────────────────────────────────────────────────

  describe('DELETE (soft archive) / Trash / restore', () => {
    let trashPageId: string;

    beforeAll(async () => {
      const r = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'TrashMe', content: 'x' });
      trashPageId = r.body.id;
    });

    it('viewer cannot archive (403)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/boards/${boardId}/wiki/pages/${trashPageId}`)
        .set('Authorization', `Bearer ${tokens.viewer}`);
      expect(res.status).toBe(403);
    });

    it('editor archives the page; tree no longer includes it; trash lists it', async () => {
      const del = await request(app.getHttpServer())
        .delete(`/boards/${boardId}/wiki/pages/${trashPageId}`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(del.status).toBe(200);
      expect(del.body.archived).toBe(true);

      const tree = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      const ids = collectIds(tree.body);
      expect(ids).not.toContain(trashPageId);

      const trash = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/trash`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(trash.status).toBe(200);
      const trashIds = trash.body.map(
        (t: { page: { id: string } }) => t.page.id,
      );
      expect(trashIds).toContain(trashPageId);
    });

    it('editor restores the page; tree includes it again', async () => {
      const res = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages/${trashPageId}/restore`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(res.status).toBe(201);
      expect(res.body.archived).toBe(false);

      const tree = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(collectIds(tree.body)).toContain(trashPageId);
    });
  });

  // ── Hard delete (admin only) ─────────────────────────────────────────

  describe('DELETE ?hard=true', () => {
    let killPageId: string;

    beforeAll(async () => {
      const r = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Doomed', content: 'x' });
      killPageId = r.body.id;
    });

    it('owner can hard-delete (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/boards/${boardId}/wiki/pages/${killPageId}?hard=true`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);

      // Subsequent GET → 404
      const get = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${killPageId}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(get.status).toBe(404);
    });

    it('editor CANNOT hard-delete (403)', async () => {
      // Create a fresh target so we have something to try.
      const fresh = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Doomed2', content: 'x' });
      const res = await request(app.getHttpServer())
        .delete(`/boards/${boardId}/wiki/pages/${fresh.body.id}?hard=true`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(res.status).toBe(403);
    });

    it('ADMIN member can hard-delete (200)', async () => {
      const fresh = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Doomed3', content: 'x' });
      const res = await request(app.getHttpServer())
        .delete(`/boards/${boardId}/wiki/pages/${fresh.body.id}?hard=true`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(res.status).toBe(200);
    });

    it('viewer cannot hard-delete (403)', async () => {
      const fresh = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Doomed4', content: 'x' });
      const res = await request(app.getHttpServer())
        .delete(`/boards/${boardId}/wiki/pages/${fresh.body.id}?hard=true`)
        .set('Authorization', `Bearer ${tokens.viewer}`);
      expect(res.status).toBe(403);
    });
  });

  // ── Version history dropdown ────────────────────────────────────────

  describe('GET /boards/:boardId/wiki/pages/:pageId/versions?limit=', () => {
    it('respects limit=2', async () => {
      const v = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${rootPageId}/versions?limit=2`)
        .set('Authorization', `Bearer ${tokens.viewer}`);
      expect(v.status).toBe(200);
      expect(v.body.length).toBeLessThanOrEqual(2);
    });

    it('limit=0 returns up to the All ceiling (50)', async () => {
      const v = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${rootPageId}/versions?limit=0`)
        .set('Authorization', `Bearer ${tokens.viewer}`);
      expect(v.status).toBe(200);
      expect(v.body.length).toBeLessThanOrEqual(50);
    });
  });

  // ── Restore version ─────────────────────────────────────────────────

  describe('POST /boards/:boardId/wiki/pages/:pageId/versions/:versionId/restore', () => {
    it('editor restores an older version; new version is appended', async () => {
      // Use a fresh page so we have a known short version history.
      const fresh = await request(app.getHttpServer())
        .post(`/boards/${boardId}/wiki/pages`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Versioned', content: 'v1' });
      await request(app.getHttpServer())
        .patch(`/boards/${boardId}/wiki/pages/${fresh.body.id}`)
        .set('Authorization', `Bearer ${tokens.editor}`)
        .send({ title: 'Versioned', content: 'v2' });

      const list = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${fresh.body.id}/versions?limit=10`)
        .set('Authorization', `Bearer ${tokens.editor}`);
      const v1 = list.body.find(
        (v: { revisionNo: number }) => v.revisionNo === 1,
      );
      expect(v1).toBeDefined();

      const res = await request(app.getHttpServer())
        .post(
          `/boards/${boardId}/wiki/pages/${fresh.body.id}/versions/${v1.id}/restore`,
        )
        .set('Authorization', `Bearer ${tokens.editor}`);
      expect(res.status).toBe(201);
      expect(res.body.content).toBe('v1');
    });

    it('viewer cannot restore (403)', async () => {
      const list = await request(app.getHttpServer())
        .get(`/boards/${boardId}/wiki/pages/${rootPageId}/versions?limit=0`)
        .set('Authorization', `Bearer ${tokens.viewer}`);
      const top = list.body[0];
      const res = await request(app.getHttpServer())
        .post(
          `/boards/${boardId}/wiki/pages/${rootPageId}/versions/${top.id}/restore`,
        )
        .set('Authorization', `Bearer ${tokens.viewer}`);
      expect(res.status).toBe(403);
    });
  });
});

/** Recursively collect page ids from a wiki tree response. */
function collectIds(
  nodes: { page: { id: string }; children?: unknown[] }[],
): string[] {
  const out: string[] = [];
  const walk = (ns: typeof nodes) => {
    for (const n of ns) {
      out.push(n.page.id);
      if (Array.isArray(n.children) && n.children.length > 0) {
        walk(n.children as typeof nodes);
      }
    }
  };
  walk(nodes);
  return out;
}
