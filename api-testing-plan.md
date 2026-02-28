# API Testing Plan: FlowForce

This document outlines the strategy for testing the NestJS backend API.

## 🧪 Unit Testing Strategy

We will use **Jest** for unit testing, focusing on business logic in Services. We will mock `PrismaService` to avoid database side effects during unit tests.

### 1. Auth Module
- **AuthService**:
    - [ ] `validateUser`: Correct password should return user object (minus password).
    - [ ] `validateUser`: Incorrect password should return null.
    - [ ] `register`: Should hash password and create user.
    - [ ] `register`: Should throw ConflictException if email exists.
    - [ ] `login`: Should return JWT access token.

### 2. Boards Module
- **BoardsService**:
    - [ ] `create`: Should create a board for a specific user.
    - [ ] `findAll`: Should return all boards for a specific user.
    - [ ] `findOne`: Should return board if user is owner.
    - [ ] `findOne`: Should throw ForbiddenException if user is not owner.
    - [ ] `update`: Should update board title if user is owner.
    - [ ] `remove`: Should delete board if user is owner.

### 3. Tasks Module
- **TasksService**:
    - [ ] `create`: Should create task in a specific column.
    - [ ] `update`: Should move task between columns.
    - [ ] `update`: Should update order.
    - [ ] Ownership checks across board -> column -> task.

## 🔄 End-to-End (E2E) Testing Strategy

We will use **Supertest** to verify full HTTP flows using a test database (or cleaned-up development database).

### Scenarios
- **Auth Flow**: Register -> Login -> GET /users/me.
- **Board Flow**: Create Board -> Create Column -> Create Task -> Move Task -> Delete Board.

## 🛠️ Testing Tools
- **Jest**: Unit testing framework.
- **Supertest**: E2E testing library.
- **mock-prisma**: Or manual mocks for Prisma service.

## 🚀 Execution
Run all tests:
```bash
cd api
npm test
```
Run e2e tests:
```bash
cd api
npm run test:e2e
```
