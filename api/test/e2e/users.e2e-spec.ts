import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/common/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let memberToken: string;
  let memberId: string;

  const adminUser = {
    email: `admin-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Admin User',
  };

  const memberUser = {
    email: `member-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Member User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get(PrismaService);

    // Ensure database is clean for consistent first-user logic
    await prisma.subtask.deleteMany({});
    await prisma.checklist.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.user.deleteMany({});

    // Register Admin (first user should be admin based on our new logic)
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminUser)
      .expect(201);
    adminToken = adminRes.body.access_token;

    // Register Member
    const memberRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(memberUser)
      .expect(201);
    memberToken = memberRes.body.access_token;
    memberId = memberRes.body.user.id;
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: [adminUser.email, memberUser.email] } },
    });
    await app.close();
  });

  describe('GET /users', () => {
    it('should allow admin to list users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should forbid member from listing users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe('POST /users/invite', () => {
    it('should allow admin to invite a user', () => {
      return request(app.getHttpServer())
        .post('/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invited@example.com', role: 'MEMBER' })
        .expect(201)
        .then((response) => {
          expect(response.body.email).toBe('invited@example.com');
          expect(response.body).toHaveProperty('token');
        });
    });

    it('should forbid member from inviting a user', () => {
      return request(app.getHttpServer())
        .post('/users/invite')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'another-invited@example.com' })
        .expect(403);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should forbid member from deleting a user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should allow admin to delete a member', () => {
      return request(app.getHttpServer())
        .delete(`/users/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should forbid admin from deleting the last admin', async () => {
      // Get admin id from the token or me endpoint
      const meRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const adminId = meRes.body.id;

      return request(app.getHttpServer())
        .delete(`/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409); // Conflict
    });
  });

  describe('POST /users/:id/role', () => {
    it('should forbid member from updating user role', () => {
      return request(app.getHttpServer())
        .post(`/users/${memberId}/role`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it('should allow admin to update member to admin', () => {
      return request(app.getHttpServer())
        .post(`/users/${memberId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' })
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
        });
    });

    it('should allow admin to demote admin to member', async () => {
      // First, create another admin to ensure we don't try to delete the last one
      const adminUser2 = {
        email: `admin2-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Admin User 2',
      };

      const admin2Res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(adminUser2)
        .expect(201);
      const admin2Token = admin2Res.body.access_token;
      const admin2Id = admin2Res.body.user.id;

      // Promote member to admin first to have an extra admin
      await request(app.getHttpServer())
        .post(`/users/${memberId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      // Now try to demote the new admin
      return request(app.getHttpServer())
        .post(`/users/${admin2Id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MEMBER' })
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
        });
    });

    it('should forbid admin from demoting the last admin', async () => {
      // Get admin id from the me endpoint
      const meRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const adminId = meRes.body.id;

      // Ensure there's only one admin
      const usersRes = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const admins = usersRes.body.filter((u: any) => u.role === 'ADMIN');

      // If there's more than one admin, we need to demote them first
      if (admins.length > 1) {
        for (const admin of admins) {
          if (admin.id !== adminId) {
            await request(app.getHttpServer())
              .post(`/users/${admin.id}/role`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ role: 'MEMBER' })
              .expect(200);
          }
        }
      }

      // Now try to demote the last admin - should fail
      return request(app.getHttpServer())
        .post(`/users/${adminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MEMBER' })
        .expect(409); // Conflict
    });

    it('should validate role input', () => {
      return request(app.getHttpServer())
        .post(`/users/${memberId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400); // Bad Request
    });
  });

  describe('POST /auth/accept-invite', () => {
    let inviteToken: string;

    beforeAll(async () => {
      const inviteRes = await request(app.getHttpServer())
        .post('/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new-member@example.com', role: 'MEMBER' })
        .expect(201);
      inviteToken = inviteRes.body.token;
    });

    it('should allow a user to accept an invitation and register', () => {
      return request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({
          token: inviteToken,
          password: 'newpassword123',
          name: 'New Member',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('access_token');
          expect(response.body.user.email).toBe('new-member@example.com');
          expect(response.body.user.role).toBe('MEMBER');
          expect(response.body.user.status).toBe('ACTIVE');
        });
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({
          token: 'invalid-token',
          password: 'password123',
          name: 'Fail User',
        })
        .expect(404);
    });
  });
});
