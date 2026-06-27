# Frontend State Management Reference

## Architecture Overview

The frontend uses React Context + useReducer with a history management layer for undo/redo support. State is persisted to localStorage and synchronized with the backend API.

---

## State Shape (BoardState)

```typescript
interface BoardState {
    tasks: Record<string, Task>;           // Normalized tasks by ID
    columns: Record<string, Column>;        // Normalized columns by ID
    columnOrder: string[];                  // Ordered column IDs
    selectedTaskIds: string[];              // Multi-select support
    viewMode: 'board' | 'list';             // Board or list view
    searchQuery: string;                    // Live search filter
    sprints: Sprint[];                     // Sprint list
    activeSprintId: string | null;          // Currently active sprint filter
    dueDateFilter: DueDateFilter;          // Due date filter: 'all' | 'overdue' | 'dueToday' | 'dueThisWeek' | 'noDate'
}

---

## KanbanProvider

Central context provider in `src/store/KanbanContext.tsx`. Provides:

```typescript
interface KanbanContextType {
    state: BoardState;           // Current state
    dispatch: (action: KanbanAction) => Promise<void>;  // Async action dispatcher
    undo: () => void;            // Undo last action
    redo: () => void;            // Redo action
    canUndo: boolean;            // History has past states
    canRedo: boolean;            // History has future states
    isSyncing: boolean;          // Currently syncing with backend
    isHydrated: boolean;         // Initial load complete
    activeBoardId: string | null;
}
```

---

## Provider Tree (single source of truth)

All providers are mounted **once** in `web/src/main.tsx` in this order (outermost → innermost):

```
<QueryClientProvider>
  <ToastProvider>            ← useToast() consumers: KanbanProvider, Board,
  <AuthProvider>               NotificationsProvider, UserManagement, Wiki
  <UserProvider>
  <KanbanProvider>           ← outermost consumer of useAuth()
  <App />                     ← renders NotificationsProvider + Router
  </KanbanProvider>
  </UserProvider>
  </AuthProvider>
  </ToastProvider>
</QueryClientProvider>
```

`web/src/App.tsx` deliberately does **not** mount `<AuthProvider>` — doing so would shadow the outer instance, so `KanbanProvider`'s `useAuth()` would see `isAuthenticated: false` even after a successful login. Login state would only re-sync on the next full page reload, leaving the Board on the "Loading Board..." spinner indefinitely. See flowforce-kanban#25 for the original post-mortem.

`NotificationsProvider` stays in `App.tsx` because it only needs to wrap the routed UI; it does not need to be visible to `KanbanProvider` (which never imports `useNotifications`).

---

## Auth Lifecycle

`web/src/store/AuthContext.tsx` implements a four-stage session lifecycle (flowforce-kanban#29):

### Stage 1 — Initial load

On mount, the provider reads `flowforce_token` and `flowforce_user` from localStorage. It decodes the JWT `exp` claim (signature is **not** verified — the server is the source of truth; the client only needs the timestamp for timing). If `exp <= now`, the stored token is treated as expired and **removed** without ever being set into React state, so no toast flashes on tab open.

### Stage 2 — Pre-expiry warning

While the user is authenticated, the provider watches the token's `exp`. When the token is within `EXPIRY_WARNING_MS` (60 seconds) of expiry, an `info` toast fires: *"Your session is about to expire. Save your work and sign in again to continue."* The user has 60 seconds to log out and back in manually until refresh-token rotation lands.

### Stage 3 — 401 soft-logout

When any API call returns 401, `web/src/lib/api.ts` dispatches the `flowforce:auth-expired` window event (the literal lives in `AUTH_EXPIRED_EVENT` from `web/src/lib/auth-events.ts`). `AuthContext` listens for it and:

1. Clears React state + localStorage (the `logout()` callback).
2. Shows a 5-second info toast: *"Your session expired. Please sign in again."*
3. Defers the `window.location.href = '/login'` redirect by **two `requestAnimationFrame` calls** (then a `setTimeout(0)`) so React can paint the toast before navigation tears down the tree. The timer is tracked in a `useRef` so the cleanup effect can cancel it if the component unmounts first.

The `api.ts` interceptor only dispatches the event if a token was actually present in localStorage, so 401s from the login form (wrong password, etc.) do not trigger the "session expired" toast.

### Stage 4 — Manual logout

The `logout()` callback (also exposed via `useAuth()`) clears state and localStorage but does **not** redirect — the caller is expected to navigate. Used by user-initiated logouts from the UI.

### Clock-skew caveat

The pre-expiry warning compares `Date.now()` (client wall clock) to the JWT `exp` claim. A user whose system clock is more than `EXPIRY_WARNING_MS` ahead of server time will skip the warning and go straight to the 401 soft-logout. This is a known tradeoff — without a server-time handshake we can't do better client-side, and the 401 soft-logout at least gives them a toast. Tracked for resolution under refresh-token rotation (follow-up to #29).

---

## History Management

Uses a Three-Stack pattern for undo/redo:

```typescript
{ past: BoardState[], present: BoardState, future: BoardState[] }
```

- **Undo:** Moves present to future, latest past becomes new present
- **Redo:** Moves present to past, latest future becomes new present
- **New action:** Current present goes to past, new computed state becomes present, future is cleared
- **SET_STATE:** Clears all history (used after API refresh)

---

## Key Actions (KanbanAction)

| Action | Purpose |
|--------|---------|
| `ADD_TASK` | Create new task, sync to API, refresh state |
| `UPDATE_TASK` | Update task properties, sync to API |
| `DELETE_TASK` | Remove task from state and API |
| `MOVE_TASK` | Drag-drop between columns, uses `/tasks/:id/move` endpoint |
| `ADD_COLUMN` / `DELETE_COLUMN` / `REORDER_COLUMN` | Column CRUD |
| `ADD_SUBTASK` / `UPDATE_SUBTASK` / `DELETE_SUBTASK` / `TOGGLE_SUBTASK` | Subtask operations |
| `REORDER_SUBTASKS` | Drag-drop subtasks, uses bulk `PATCH /subtasks/reorder` |
| `ADD_CHECKLIST` / `DELETE_CHECKLIST` / `UPDATE_CHECKLIST` | Checklist operations |
| `SET_VIEW_MODE` | Toggle board/list view, persisted to localStorage (local-only, no history) |
| `SET_SPRINTS` | Set sprint list, used after board load (local-only, no history) |
| `SET_ACTIVE_SPRINT` | Filter board by sprint, refetches board data |
| `SET_DUE_DATE_FILTER` | Filter tasks by due date: all, overdue, dueToday, dueThisWeek, noDate |
| `UPDATE_TASK_DUE_DATE` | Update task's due date, syncs to API |
| `ASSIGN_TASK_TO_SPRINT` | Assign/unassign task to sprint |
| `UNDO` / `REDO` | User-triggered history navigation |
| `INTERNAL_UNDO` / `INTERNAL_REDO` | Internal history stack operations |

---

## Sync Strategy

The `wrappedDispatch` function:

1. Updates local state immediately via `setHistory(action)`
2. Makes async API call to persist change
3. On success, re-fetches board state via `refreshBoardState()` and calls `SET_STATE`
4. On failure, logs error but keeps optimistic local state

**Note:** Some actions (UNDO/REDO, view mode changes) are purely local and skip API sync.

---

## API Response Mapping

`src/lib/mappers.ts` contains `mapApiBoardToState` which transforms API response:

```
API Board → BoardState
- board.columns[] → columns{} + columnOrder[]
- board.tasks[] → tasks{} (keyed by id)
```

---

## Frontend Type vs Backend Type

Frontend uses lowercase priorities (`'low' | 'medium' | 'high'`), backend uses uppercase (`'LOW' | 'MEDIUM' | 'HIGH'`). Conversion happens in API calls via `.toUpperCase()` and in mappers.

---

## NotificationsProvider (real-time inbox)

Central context for the in-app notification inbox, defined in `web/src/store/NotificationsContext.tsx`. The provider is split into **two contexts** so consumers that only render data (the bell) do not re-render when the actions layer changes identity.

### State context

```typescript
interface NotificationsState {
  notifications: AppNotification[];  // Most recent first, capped at MAX_KEEP (100)
  unreadCount: number;              // Server snapshot; not derivable from `notifications` while polling is active
  prefs: UserNotificationPref[];    // Per-user opt-outs; absence = enabled
  isConnected: boolean;             // WebSocket connection state
  hasMore: boolean;                 // More pages exist beyond the cached slice
  isLoadingMore: boolean;           // loadMore in-flight guard
}
```

Hook: `useNotificationState()`. Subscribes to data only.

### Actions context

```typescript
interface NotificationsActions {
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePref: (type: NotificationType, inAppEnabled: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
}
```

Hook: `useNotificationActions()`. Subscribes to the callbacks only; the value is stable across data changes. **The bell uses only this hook for callbacks plus `useNotificationState()` for `unreadCount`, so it does not re-render on every notification push** (a regression that the merged-context pattern would cause because the bell is rendered inside the heavy `Board` header).

A convenience hook `useNotifications()` returns the merged object for components that genuinely need both. Prefer the split hooks otherwise.

### Lifecycle

- **Auth gate.** The socket effect is gated on `isAuthenticated && token` from `AuthContext`. On logout / token refresh the effect tears down listeners, disconnects, and calls `resetSocket()` from `lib/socket.ts` so the next `getSocket()` rebuilds with the new token.
- **Initial load.** On first connect, the provider fires `loadInitial()` which runs `getNotifications(20)`, `getUnreadCount`, and `getNotificationPrefs` in parallel via `Promise.all`. Prefs failure is swallowed (an empty array is the most-permissive default).
- **Polling fallback.** When the socket disconnects, the provider starts a 30 s `setInterval` that polls `getUnreadCount`. **The polling tick uses a functional setter with a `prev === count ? prev : count` guard so an unchanged count does not re-render every consumer.** On reconnect, the interval is cleared and the initial load is re-run so the cache converges with the server.
- **MAX_KEEP.** The local notifications list is capped at 100. Incoming socket events prepend to the head and dedupe by id.
- **`stateRef` mirror.** Optimistic updates and rollbacks in `markAsRead` read from a `useRef` mirror of the latest state (synced in an effect) so the rollback uses a functional setter that composes with concurrent `markAsRead` calls — early closure-captured snapshots would clobber a successful concurrent mark when the first call's request failed.
- **Optimistic rollback.** `markAsRead`, `markAllAsRead`, and `updatePref` roll back on failure and surface the error via `useToast` (not `console.error` — see `components/admin/UserManagement.tsx` for the precedent).

### Socket event

The server emits `notification` events. The event name is hoisted to a module-level `NOTIFICATION_EVENT` constant in `NotificationsContext.tsx` so the on/off registration pairs cannot drift. Payload shape lives in `src/types/index.ts:AppNotification`; the `actor` object is split into `actorId` + `actorName` flat fields on the wire (see `docs/references/api-endpoints.md`).

### WebSocket client

`web/src/lib/socket.ts` is a module-level singleton. `getSocket()` lazily creates a client bound to `VITE_API_URL` and reads the JWT from `localStorage.flowforce_token` at construction time. `resetSocket()` removes listeners, disconnects, and nulls the singleton so the next `getSocket()` rebuilds after a token rotation.