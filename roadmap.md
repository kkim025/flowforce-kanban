# FlowForce Kanban — Roadmap & Developer Guide

## Overview

FlowForce Kanban is a project management web app: real-time boards, tasks, columns, and team collaboration. The repository is a **monorepo** containing the NestJS API and the Vite/React frontend.

## Repository Layout

```
flowforce-kanban/
├── api/                  NestJS REST API (TypeScript) + Prisma ORM
│   ├── prisma/           Prisma schema, migrations, seed
│   ├── src/              Application source (modules, controllers, services)
│   ├── test/             e2e tests
│   └── docker-compose.yml  PostgreSQL dev database
├── web/                  Vite + React 19 + TypeScript SPA
│   ├── src/              React components, hooks, context
│   └── vite.config.ts
├── .github/workflows/    CI (ci.yml) and Deploy (deploy.yml) pipelines
├── docs/                 Additional project documentation
├── package.json          Root scripts that orchestrate the monorepo
└── roadmap.md            This file
```

## Quick Start

Prerequisites: **Node.js 20+** and **Docker** (for the local PostgreSQL instance).

1. Install dependencies for the root, API, and web:
   ```sh
   npm run install-all
   ```
2. Start the PostgreSQL database (defined in `api/docker-compose.yml`):
   ```sh
   docker compose -f api/docker-compose.yml up -d
   ```
3. Apply Prisma migrations and start both servers (API on `:5000`, web on Vite's default port):
   ```sh
   npm run dev
   ```
   The `dev` script uses `concurrently` to run `api` and `web` together. The API's `start:dev` script auto-runs `prisma migrate dev` before starting the NestJS watcher.

## Test & Build Commands

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run install-all` | Install root + `api/` + `web/` dependencies |
| `npm test`         | Run API Jest tests, then web Vitest tests     |
| `npm run test:api` | Run only API tests                            |
| `npm run test:web` | Run only web tests                            |
| `npm run lint`     | Lint the API (ESLint)                         |
| `npm run build`    | Build the API (`nest build`) then web (`tsc && vite build`) |
| `npm run dev`      | Run both servers in dev mode with hot reload  |

## Branch & PR Workflow

1. **Branch from `development`** (not `main`). Naming convention: `feature/<short-name>`.
   - Examples already in the repo: `feature/keyboard-navigation`, `feature/notifications`, `feature/multi-board-support`.
2. Develop and commit on your feature branch.
3. **Open a PR back to `development`** when the feature is ready. Paul reviews and merges.
4. Releases to production flow from `development` → `main`; `main` is what `deploy.yml` deploys from.

Typical work cycle:

```
development ──► feature/your-feature ──PR─► development ──► main
```

## Database Setup Notes

- **Engine**: PostgreSQL 15 (alpine), defined in `api/docker-compose.yml`.
- **Default credentials** (local dev only):
  - user: `postgres`
  - password: `password`
  - database: `flowforce`
  - port: `5432`
- **ORM**: Prisma 7. The schema lives at `api/prisma/schema.prisma`. The generated client output and connection URL are configured via `api/prisma.config.ts` and `api/.env`.
- **Migrations**:
  - `npm run db:migrate` (run from `api/`) — apply pending migrations in production-style (`migrate deploy`).
  - `npm run start:dev` — runs `prisma migrate dev` (creates a new migration if the schema changed) before booting the API in watch mode.
- **CI**: the `ci.yml` workflow spins up a `postgres:15-alpine` service, waits for it to be healthy, and runs `npx prisma migrate deploy` against it before running tests.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): runs on every PR and push to `development` / `main`. Spins up Postgres, installs dependencies, applies Prisma migrations, lints, tests, and builds.
- **Deploy** (`.github/workflows/deploy.yml`): runs on push to `main`. Builds artifacts and prints a placeholder `Deploy step` echo. **This is a stub** — wire it to real infrastructure (SSH, cloud provider, container registry, etc.) in a follow-up task.
