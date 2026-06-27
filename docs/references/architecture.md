# Architecture Reference

## Backend (api/)

NestJS application with domain-driven design patterns.

### Module Structure (`src/modules/`)

Each feature module follows DDD structure:
```
modules/<name>/
├── domain/
│   ├── <name>.entity.ts      # Domain entity
│   ├── <name>.repository.interface.ts  # Repository interface
│   └── *.value-object.ts     # Value objects
├── application/
│   ├── dto/                  # Data transfer objects
│   └── use-cases/            # Business logic use cases
└── infrastructure/
    └── persistence/
        ├── prisma-<name>.repository.ts  # Prisma implementation
        └── <name>.mapper.ts              # Entity <-> Prisma mapper
```

### Key Modules
- **boards** - Board management, includes column aggregation
- **columns** - Column CRUD and reordering
- **tasks** - Task management with checklists/subtasks
- **subtasks** - Subtask operations (standalone controller/service)
- **checklists** - Checklist management
- **sprints** - Sprint lifecycle (planning, active, completed, archived)
- **users** - User management, invitations, and the controller surface for notification preferences
- **notifications** - WebSocket gateway, listener, due-date scanner, and use cases
- **notification-prefs** - Shared per-user notification-preference repository, consumed by both `UsersModule` (use cases) and `NotificationsModule` (`CreateNotificationUseCase`). See "Module Dependency Cycles" below for why it is its own module.

### Shared Modules (`src/auth/`)

Cross-cutting auth wiring lives in dedicated modules so the same provider is registered exactly once:

- **`JwtAuthModule`** — the single source of truth for `JwtModule.registerAsync({...})`. It sources the secret from `ConfigService` and sets `signOptions.expiresIn`. Any module that needs `JwtService` (currently `AuthModule`, `UsersModule`, `NotificationsModule`) imports `JwtAuthModule` rather than declaring its own `JwtModule.registerAsync` — that would create multiple `JwtService` instances and let the policy drift between sites.
- **Why this matters:** before the extraction, three modules each declared `JwtModule.registerAsync`, so `JwtModule dependencies initialized` was logged three times at boot. Now it logs once.

### Module Dependency Cycles

Several module pairs have circular dependencies that are resolved with `forwardRef(() => OtherModule)` at the module boundary. The pattern is symmetric — both sides of the cycle wrap the import in `forwardRef`. Once the module-level cycle is broken, constructor injection across the boundary works without an `@Inject(forwardRef(...))` decorator on the constructor (e.g. `TasksController` injects `ChecklistsService` from a `forwardRef`'d `ChecklistsModule` without the decorator).

Current cycles and their `forwardRef` sites:

- **`BoardsModule` ↔ `ColumnsModule`** — `BoardsModule.imports` wraps `ColumnsModule` in `forwardRef`. `ColumnsModule` does not wrap `BoardsModule` (one-sided is enough because the dependency is asymmetric: boards aggregate columns).
- **`TasksModule` ↔ `BoardsModule`** and **`TasksModule` ↔ `ChecklistsModule`** — both sides wrap each side in `forwardRef`. See the `imports: [...]` arrays in `tasks.module.ts`, `boards.module.ts`, `checklists.module.ts`.
- **`SubtasksModule` → `TasksModule`** and **`SubtasksModule` → `BoardsModule`** — `SubtasksModule.imports` wraps both in `forwardRef`. The reverse edges go through `TasksModule`/`BoardsModule`, not directly from `SubtasksModule`.
- **`ChecklistsModule` → `BoardsModule`** — same one-way pattern as `ColumnsModule`.

Notably **not** a cycle anymore: the `UsersModule ↔ NotificationsModule` dep is now strictly one-way through a third module. `NotificationPrefsModule` owns the `UserNotificationPref` entity, the `IUserNotificationPrefRepository` interface, and the Prisma implementation; `UsersModule` and `NotificationsModule` both import it. `UsersController` depends on local use cases (`ListPrefsUseCase`, `UpsertPrefUseCase`) which read from the shared repo. `NotificationsModule` no longer needs to import `UsersModule`, and `NotificationsModule` no longer needs to import `AuthModule` (it gets `JwtService` from `JwtAuthModule`). The forwardRef escape hatch is reserved for cycles that can't be broken by relocation.

### Authentication (`src/auth/`)
- JWT strategy via Passport (`jwt.strategy.ts`) — also imports the shared `JwtPayload` type
- Local strategy for username/password (`local.strategy.ts`)
- JWT auth guard (`jwt-auth.guard.ts`)
- Role-based access via `roles.decorator.ts` and `roles.guard.ts`
- **`jwt-payload.interface.ts`** — shared `JwtPayload` type imported by both `JwtStrategy` (HTTP) and `WsJwtGuard` (Socket.IO) so the wire contract cannot drift between the two auth paths

### Shared (`src/common/`)
- `decorators/get-user.decorator.ts` - Extract authenticated user from request
- `prisma/prisma.service.ts` - Prisma client singleton
- `domain/entity.ts`, `value-object.ts`, `aggregate-root.ts`, `result.ts` - DDD base classes
- `filters/all-exceptions.filter.ts` - Global exception handling

---

## Frontend (web/)

React 19 with unidirectional data flow and optimistic updates.

### State Management (`src/store/`)

**KanbanContext.tsx** - Central provider:
- Wraps entire app
- Manages history stack for undo/redo (past/present/future)
- `wrappedDispatch` handles optimistic updates + API sync
- Exposes: `state`, `dispatch`, `undo`, `redo`, `canUndo`, `canRedo`, `isSyncing`, `isHydrated`

**kanbanReducer.ts** - Pure state transitions:
- Receives `KanbanAction` and current `BoardState`
- Returns new `BoardState` (immutable)
- Handles: task/column/checklist CRUD, move/reorder, sprint management

### Key Files
- `lib/api.ts` - Axios instance with JWT interceptor
- `lib/mappers.ts` - `mapApiBoardToState()` transforms API response
- `lib/utils.ts` - Utility functions
- `types/index.ts` - TypeScript interfaces (`Task`, `Column`, `BoardState`, `KanbanAction`, etc.)

### UI Components (`src/components/`)
- **Board.tsx** - Main kanban board with drag-drop (@hello-pangea/dnd)
- **Column.tsx** - Column with task cards and WIP limit display
- **TaskCard.tsx** - Compact task preview on board
- **TaskViewer.tsx** / **TaskSidebar.tsx** - Task detail panel
- **ListView.tsx** - Table/list alternative view
- **ChecklistSection.tsx** - Subtask progress display
- **SubtaskList.tsx** / **SubtaskPopover.tsx** - Subtask management UI
- **auth/** - LoginForm, RegisterForm, ProtectedRoute
- **sprints/** - Sprint management components
- **admin/** - UserManagement

### Dark Mode

FlowForce supports full dark mode using Tailwind's `dark:` variant strategy.

**Theme System:**
- **Provider:** `ThemeContext` in `web/src/context/ThemeContext.tsx`
- **Hook:** `useTheme()` returns `{ theme, resolvedTheme, toggleTheme, setTheme }`
- **Persistence:** Theme preference stored in `localStorage` under key `flowforce-theme`
- **System detection:** Uses `window.matchMedia('(prefers-color-scheme: dark)')` on first visit

**No-Flash Implementation:**
A blocking script in `web/index.html` applies the theme class before React hydrates:

```html
<script>
  (function() {
    const stored = localStorage.getItem('flowforce-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  })();
</script>
```

**CSS Strategy:**
All components use Tailwind `dark:` variants. Dark glassmorphism uses:
- Background: `bg-slate-900/60` (was `bg-white/40`)
- Border: `border-white/10` (unchanged)
- Body: `bg-slate-950` in dark mode

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `n` | New task |
| `/` | Focus search |
| `Ctrl+Click` | Multi-select tasks |

---

## Database

PostgreSQL via Prisma ORM. See [database-schema.md](database-schema.md) for full schema reference.