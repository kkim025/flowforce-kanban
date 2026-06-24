import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Boards (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: `boards-test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Boards Tester',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get(PrismaService);

    // 1. Setup User
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    accessToken = regRes.body.access_token;
    userId = regRes.body.user.id;

    // 2. Setup Board, Column, Task
    const board = await prisma.board.create({
      data: { title: 'Test Board', ownerId: userId },
    });
    const column = await prisma.column.create({
      data: { title: 'Test Col', boardId: board.id, order: 0 },
    });
    const task = await prisma.task.create({
      data: { content: 'Test Task', columnId: column.id, order: 0 },
    });
    const checklist = await prisma.checklist.create({
      data: { title: 'Test Checklist', taskId: task.id },
    });
    await prisma.subtask.create({
      data: { content: 'Task Subtask', taskId: task.id },
    });
    await prisma.subtask.create({
      data: { content: 'Checklist Item', checklistId: checklist.id },
    });
  });

  afterAll(async () => {
    if (userId) {
      const boards = await prisma.board.findMany({
        where: { ownerId: userId },
      });
      for (const board of boards) {
        const columns = await prisma.column.findMany({
          where: { boardId: board.id },
        });
        for (const col of columns) {
          const tasks = await prisma.task.findMany({
            where: { columnId: col.id },
          });
          for (const task of tasks) {
            await prisma.checklist.deleteMany({ where: { taskId: task.id } });
            await prisma.subtask.deleteMany({ where: { taskId: task.id } });
          }
          await prisma.task.deleteMany({ where: { columnId: col.id } });
        }
        await prisma.column.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });
      }
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  it('should fetch all boards (list view - columns without tasks)', async () => {
    // findAll uses BOARD_LIST_CONFIG which excludes tasks for performance
    const res = await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // List view should still have columns
    const board = res.body[0];
    expect(board.columns).toBeDefined();
    // But tasks are excluded in list view for performance
    expect(board.columns[0].tasks).toBeUndefined();
  });

  it('should fetch single board with complex nested relations', async () => {
    const boardsRes = await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${accessToken}`);

    const boardId = boardsRes.body[0].id;

    const res = await request(app.getHttpServer())
      .get(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(boardId);
    expect(res.body.columns).toBeDefined();
    expect(res.body.columns[0].tasks[0].checklists[0].items).toBeDefined();
  });
});
