import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Checklists (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let taskId: string;

  const testUser = {
    email: `checklist-test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Checklist Tester',
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
      data: { title: 'Test Board', ownerId: userId }
    });
    const column = await prisma.column.create({
      data: { title: 'Test Col', boardId: board.id, order: 0 }
    });
    const task = await prisma.task.create({
      data: { content: 'Test Task', columnId: column.id, order: 0 }
    });
    taskId = task.id;
  });

  afterAll(async () => {
    // Delete in order to avoid FK constraints
    if (userId) {
      const boards = await prisma.board.findMany({ where: { ownerId: userId } });
      for (const board of boards) {
        await prisma.column.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });
      }
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  it('should create a checklist', async () => {
    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'New Checklist' })
      .expect(201);

    expect(res.body.title).toBe('New Checklist');
    expect(res.body.taskId).toBe(taskId);
    return res.body.id;
  });

  it('should create subtasks in checklist', async () => {
    // First create a checklist
    const clRes = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'List for items' });
    
    const checklistId = clRes.body.id;

    const res = await request(app.getHttpServer())
      .post('/subtasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Item 1', checklistId })
      .expect(201);

    expect(res.body.content).toBe('Item 1');
    expect(res.body.checklistId).toBe(checklistId);
  });

  it('should update a checklist title', async () => {
    const clRes = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Old Title' });
    
    const res = await request(app.getHttpServer())
      .patch(`/checklists/${clRes.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Title' })
      .expect(200);

    expect(res.body.title).toBe('Updated Title');
  });

  it('should delete a checklist', async () => {
    const clRes = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'To Delete' });
    
    await request(app.getHttpServer())
      .delete(`/checklists/${clRes.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const check = await prisma.checklist.findUnique({ where: { id: clRes.body.id } });
    expect(check).toBeNull();
  });
});
