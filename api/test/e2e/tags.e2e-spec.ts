import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/common/prisma/prisma.service';

/**
 * Tags (e2e) — full happy-path + auth + dedup + tag-task join lifecycle
 * against a real Postgres + the real Nest app. Pairs with the unit
 * tests in test/unit/modules/tags/* (which mock the repo).
 *
 * Covers:
 *   - POST /tags create + duplicate-name 409 + bad color 400
 *   - GET  /tags?boardId= lists only the requested board's library
 *   - PATCH /tags/:id rename + recolor
 *   - DELETE /tags/:id cascades TaskTag rows
 *   - Task tags[] wire shape: POST /tasks with tags[] creates library
 *     rows on demand, attaches via TaskTag, returns rich shape on
 *     GET /tasks?columnId= and PATCH /tasks/:id
 */
describe('Tags (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerId: string;
  let boardId: string;
  let columnId: string;
  let taskId: string;

  const ownerEmail = `tag-owner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Register owner.
    const reg = await request(app.getHttpServer()).post('/auth/register').send({
      email: ownerEmail,
      password: 'password123',
      name: 'Tag Owner',
    });
    expect(reg.status).toBeLessThan(400);
    ownerToken = reg.body.access_token;
    ownerId = reg.body.user.id;

    // Create board + column for task tests.
    const board = await prisma.board.create({
      data: { title: 'Tags Test Board', ownerId },
    });
    boardId = board.id;
    const column = await prisma.column.create({
      data: { title: 'Todo', order: 0, boardId },
    });
    columnId = column.id;

    // Seed one task for the tag-attach tests.
    const task = await prisma.task.create({
      data: {
        content: 'Seed task',
        order: 0,
        columnId,
      },
    });
    taskId = task.id;
  });

  afterAll(async () => {
    // Cascade: tasks -> taskTags, tags cascade from board via ON DELETE CASCADE.
    if (taskId) {
      await prisma.task.delete({ where: { id: taskId } });
    }
    if (boardId) {
      await prisma.board.delete({ where: { id: boardId } });
    }
    if (ownerId) {
      await prisma.user
        .delete({ where: { id: ownerId } })
        .catch(() => undefined);
    }
    await app.close();
  });

  // ── Auth ────────────────────────────────────────────────────────────

  describe('Auth', () => {
    it('rejects unauthenticated POST /tags with 401', async () => {
      await request(app.getHttpServer())
        .post('/tags')
        .send({ boardId, name: 'x' })
        .expect(401);
    });

    it('rejects unauthenticated GET /tags with 401', async () => {
      await request(app.getHttpServer())
        .get(`/tags?boardId=${boardId}`)
        .expect(401);
    });
  });

  // ── POST /tags ──────────────────────────────────────────────────────

  describe('POST /tags', () => {
    it('creates a tag with default color', async () => {
      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'frontend' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('frontend');
      expect(res.body.color).toBe('#94a3b8');
      expect(res.body.boardId).toBe(boardId);
      // The entity base assigns a random base36 id when none is provided
      // (see common/domain/entity.ts). The schema default (uuid()) applies
      // when the column is omitted at the SQL level, which the upsert
      // path never does — it always passes an explicit id. So we just
      // assert the id is a non-empty string and the board/name round-trip.
      expect(typeof res.body.id).toBe('string');
      expect(res.body.id.length).toBeGreaterThan(0);
    });

    it('creates a tag with explicit color', async () => {
      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'urgent', color: '#ef4444' });
      expect(res.status).toBe(201);
      expect(res.body.color).toBe('#ef4444');
    });

    it('normalizes name to lowercase', async () => {
      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: '  Backend  ' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('backend');
    });

    it('rejects duplicate name on the same board with 409', async () => {
      // frontend was created above.
      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'frontend' });
      expect(res.status).toBe(409);
    });

    it('rejects duplicate name regardless of case with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'FRONTEND' });
      expect(res.status).toBe(409);
    });

    it('rejects malformed color with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'badcolor', color: 'red' });
      expect(res.status).toBe(400);
    });

    it('rejects empty name with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: '' });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /tags?boardId= ─────────────────────────────────────────────

  describe('GET /tags?boardId=', () => {
    it('returns the library sorted alphabetically', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tags?boardId=${boardId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      const names = res.body.map((t: { name: string }) => t.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      // backend, frontend, urgent should all be there (created above).
      expect(names).toContain('backend');
      expect(names).toContain('frontend');
      expect(names).toContain('urgent');
    });

    it('only returns tags for the requested board', async () => {
      // Create a separate board with its own tag.
      const otherBoard = await prisma.board.create({
        data: { title: 'Other', ownerId },
      });
      await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId: otherBoard.id, name: 'isolated' });

      const res = await request(app.getHttpServer())
        .get(`/tags?boardId=${boardId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const names = res.body.map((t: { name: string }) => t.name);
      expect(names).not.toContain('isolated');

      // Cleanup the other board (cascades its tags).
      await prisma.board.delete({ where: { id: otherBoard.id } });
    });
  });

  // ── PATCH /tags/:id ────────────────────────────────────────────────

  describe('PATCH /tags/:id', () => {
    let patchTargetId: string;

    beforeAll(async () => {
      const r = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'original' });
      patchTargetId = r.body.id;
    });

    it('renames a tag', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tags/${patchTargetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'renamed' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('renamed');
    });

    it('recolors a tag', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tags/${patchTargetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ color: '#10b981' });
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#10b981');
    });

    it('returns 404 for an unknown tag id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/tags/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'whatever' });
      expect(res.status).toBe(404);
    });

    it('rejects rename into an existing name with 409', async () => {
      // 'backend' already exists on this board.
      const res = await request(app.getHttpServer())
        .patch(`/tags/${patchTargetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'backend' });
      expect(res.status).toBe(409);
    });
  });

  // ── Tag ↔ Task attach via task create / update ─────────────────────

  describe('Tag ↔ Task attach (rich wire shape)', () => {
    let bugTagId: string;
    let featureTagId: string;

    beforeAll(async () => {
      // Create two tags in the library up front.
      const bug = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'bug', color: '#ef4444' });
      bugTagId = bug.body.id;

      const feature = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'feature', color: '#3b82f6' });
      featureTagId = feature.body.id;
    });

    it('attaches existing library tags by id on PATCH /tasks/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tags: [
            { id: bugTagId, name: 'bug', color: '#ef4444' },
            { id: featureTagId, name: 'feature', color: '#3b82f6' },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.tags).toHaveLength(2);
      const names = res.body.tags.map((t: { name: string }) => t.name).sort();
      expect(names).toEqual(['bug', 'feature']);

      // Verify the join rows exist.
      const joins = await prisma.taskTag.findMany({ where: { taskId } });
      expect(joins).toHaveLength(2);
    });

    it('creates a NEW library row when name does not exist', async () => {
      // Detach by sending a single new tag name (no id).
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tags: [{ name: 'spike', color: '#f59e0b' }],
        });
      expect(res.status).toBe(200);
      expect(res.body.tags).toHaveLength(1);
      expect(res.body.tags[0].name).toBe('spike');
      expect(res.body.tags[0].color).toBe('#f59e0b');

      // Library grew.
      const lib = await prisma.tag.findFirst({
        where: { boardId, name: 'spike' },
      });
      expect(lib).not.toBeNull();
      expect(lib?.color).toBe('#f59e0b');
    });

    it('preserves tags when PATCH omits the field', async () => {
      // First set tags to [bug].
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ tags: [{ id: bugTagId, name: 'bug', color: '#ef4444' }] });

      // Now PATCH without `tags` — should be a no-op for tags.
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ priority: 'LOW' });
      expect(res.status).toBe(200);
      expect(res.body.tags).toHaveLength(1);
      expect(res.body.tags[0].name).toBe('bug');
    });

    it('returns rich tags[] on GET /tasks?columnId=', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tasks?columnId=${columnId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      const found = res.body.find((t: { id: string }) => t.id === taskId);
      expect(found).toBeDefined();
      expect(Array.isArray(found.tags)).toBe(true);
      expect(found.tags.length).toBeGreaterThan(0);
      expect(found.tags[0]).toHaveProperty('id');
      expect(found.tags[0]).toHaveProperty('name');
      expect(found.tags[0]).toHaveProperty('color');
    });
  });

  // ── DELETE /tags/:id cascades TaskTag ──────────────────────────────

  describe('DELETE /tags/:id', () => {
    let doomedId: string;

    beforeAll(async () => {
      // Create + attach a doomed tag.
      const r = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ boardId, name: 'doomed' });
      doomedId = r.body.id;
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ tags: [{ id: doomedId, name: 'doomed', color: '#94a3b8' }] });

      // Sanity: join row exists.
      const before = await prisma.taskTag.findFirst({
        where: { tagId: doomedId },
      });
      expect(before).not.toBeNull();
    });

    it('deletes the tag and cascades its TaskTag rows', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/tags/${doomedId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      const tag = await prisma.tag.findUnique({ where: { id: doomedId } });
      expect(tag).toBeNull();

      const joins = await prisma.taskTag.findMany({
        where: { tagId: doomedId },
      });
      expect(joins).toHaveLength(0);
    });

    it('returns 404 when the tag is already gone', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/tags/${doomedId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(404);
    });
  });
});
