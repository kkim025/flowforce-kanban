# Backend Implementation Plan: FlowForce API

This document outlines the plan to implement a robust backend for FlowForce Kanban using NestJS, PostgreSQL, and native JWT Authentication.

## 🏗️ Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) (TypeScript)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via Docker)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: Native NestJS JWT Auth (Passport + Bcrypt)
- **Containerization**: [Docker Compose](https://docs.docker.com/compose/)
- **Validation**: `class-validator` + `class-transformer`

## 🗄️ Database Architecture (Prisma Schema)

We will define the following models to support the Kanban board functionality.

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Hashed password
  name      String?
  boards    Board[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Board {
  id        String   @id @default(uuid())
  title     String
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  columns   Column[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Column {
  id        String   @id @default(uuid())
  title     String
  order     Int      // To maintain column position
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id          String    @id @default(uuid())
  content     String
  description String?
  priority    Priority  @default(MEDIUM)
  order       Int       // To maintain task position
  columnId    String
  column      Column    @relation(fields: [columnId], references: [id], onDelete: Cascade)
  subtasks    Subtask[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Subtask {
  id        String   @id @default(uuid())
  content   String
  completed Boolean  @default(false)
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

## 🔒 Authentication (Native JWT)

- **Passport Strategies**:
    - `LocalStrategy`: Validates username/password for login.
    - `JwtStrategy`: Validates JWT token for protected routes.
- **Security**: `bcrypt` for password hashing and `jsonwebtoken` for secure stateless sessions.
- **Endpoints**:
    - `POST /auth/register`: Create a new user.
    - `POST /auth/login`: Authenticate and return JWT.

## 🚀 Implementation Roadmap

### Phase 1: Infrastructure & Setup
- [x] **Initialize NestJS**: Create new NestJS project in `api` directory.
- [x] **Docker Setup**: Create `docker-compose.yml` for PostgreSQL.
- [x] **Prisma Init**: Initialize Prisma and define the schema.
- [x] **Environment**: Configure `.env` for DB connection.

### Phase 2: Core Modules & Auth (Refactor)
- [x] **Dependencies**: Install `bcrypt`, `@nestjs/jwt`, `passport-local`.
- [x] **Schema Update**: Add `password` field to `User` model.
- [x] **Auth Service**: Implement registration and login logic.
- [x] **Strategies**: Implement `LocalStrategy` and `JwtStrategy`.
- [x] **Guards**: Replace Supabase logic with `JwtAuthGuard`.

### Phase 3: Feature Implementation (CRUD)
- [x] **Board Module**: Create, Read (All/One), Update, Delete.
- [x] **Column Module**: Manage columns and reordering.
- [x] **Task Module**: Manage tasks, moving between columns, reordering.
- [x] **Subtask Module**: Add/check subtasks.

### Phase 4: Frontend Integration
- [ ] **API Client**: Generate or create an API client in the `web` project.
- [ ] **Auth Context**: Implement AuthProvider in React to handle JWT storage.
- [ ] **State Sync**: Replace `localStorage` persistence with API calls.

## 📂 Project Structure (api/)

```text
api/
├── src/
│   ├── auth/              # JWT, Local strategy, hashing
│   ├── common/            # PrismaService, Global decorators
│   ├── modules/           # Feature modules (boards, columns, tasks)
│   ├── app.module.ts      # Root module
│   └── main.ts            # Entry point
├── docker-compose.yml
├── prisma/
│   └── schema.prisma
└── .env
```
