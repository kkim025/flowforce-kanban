# Development Commands Reference

## Prerequisites

- **Node.js 22 LTS** — required locally and in CI (`.github/workflows/ci.yml`,
  `.github/workflows/deploy.yml`). The API uses `@types/node` ^22 and the web
  project uses Vite 7 / Vitest 4 which expect Node 22+ features. Older Node
  versions (e.g. Node 20) will fail in CI.
- **Docker** — required only for the local PostgreSQL service.

## Root (both apps)

From repository root (`/`):

```bash
npm run dev          # Start both API (:3000) and Web (:5173) concurrently
npm run install-all  # Install dependencies for root, api, and web
npm run test         # Run both API (Jest) and Web (Vitest) tests
npm run build        # Build both api and web
npm run lint         # Lint api code
```

## API (NestJS)

Working directory: `api/`

```bash
npm run start          # Production start (node dist/main)
npm run start:dev      # Watch mode with hot reload (nest start --watch)
npm run start:debug    # Debug mode with watch
npm run start:prod     # Production (node dist/main)
npm run test           # Unit tests (Jest)
npm run test:watch     # Unit tests in watch mode
npm run test:cov       # Test coverage report
npm run test:debug     # Debug tests with node inspect
npm run test:e2e       # E2E tests (jest --config ./test/jest-e2e.json)
npm run lint           # ESLint with --fix
npm run format         # Prettier write

# Database
npx prisma migrate dev # Create and apply migrations
npx prisma migrate deploy # Apply migrations (production)
npx prisma generate     # Generate Prisma client
npx prisma studio       # Open Prisma Studio (GUI)
```

## Web (React/Vite)

Working directory: `web/`

```bash
npm run dev            # Vite dev server (localhost:5173)
npm run build          # TypeScript check + Vite build
npm run preview        # Preview production build
npm run test           # Vitest (use --run in CI to prevent watch mode hanging)
npm run lint           # ESLint
```

## Docker

```bash
# Start PostgreSQL database
cd api && docker-compose up -d

# Stop database
cd api && docker-compose down
```

## Testing Architecture

- **Root**: `npm test` runs both API and Web tests sequentially
- **API**: Jest with ts-jest, tests alongside source files (*.spec.ts)
- **Web**: Vitest with jsdom environment, tests alongside source files (*.test.tsx)