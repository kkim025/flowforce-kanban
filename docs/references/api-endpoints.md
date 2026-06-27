# API Endpoints Reference

**Base URL:** `http://localhost:3000`
**Authentication:** JWT Bearer token in `Authorization` header

---

## Authentication

JWT tokens are issued by `/auth/login` and `/auth/register` with an **8-hour TTL** (configured in `api/src/auth/jwt-auth.module.ts`, flowforce-kanban#29). The frontend reads the `exp` claim client-side to schedule a 60-second pre-expiry warning toast and a soft-logout flow on 401 — see `docs/references/frontend-state.md` for the full lifecycle.

### 401 response handling

The NestJS API returns 401 for invalid, expired, or revoked tokens. The frontend axios interceptor in `web/src/lib/api.ts` handles 401 by:

1. Wiping `flowforce_token` and `flowforce_user` from localStorage.
2. Dispatching the `flowforce:auth-expired` window event (`AUTH_EXPIRED_EVENT` constant in `web/src/lib/auth-events.ts`) **if a token was present** — avoids spurious "session expired" toasts for unauthenticated callers hitting a protected endpoint, e.g. the login form itself with a wrong password.
3. `AuthContext` listens for the event and shows a toast + defers a redirect to `/login` by two animation frames.

If `AuthProvider` is not mounted (raw API consumer, tests), the interceptor falls back to `window.location.href = '/login'`.

### Register
```
POST /auth/register
Body: { "email": string, "password": string, "name"?: string }
Response: { "access_token": string }
```

### Login
```
POST /auth/login
Body: { "email": string, "password": string }
Response: { "access_token": string }
```

---

## Boards

### List Boards
```
GET /boards
Response: Board[]
```

### Get Board
```
GET /boards/:id?sprintId=:sprintId
Response: Board (with columns, tasks, checklists, subtasks)
```

### Create Board
```
POST /boards
Body: { "title": string }
Response: Board
```

---

## Columns

### Add Column
```
POST /columns
Body: { "title": string, "boardId": string, "order": number }
```

### Update Column
```
PATCH /columns/:id
Body: { "title"?: string, "wipLimit"?: number }
```

### Delete Column
```
DELETE /columns/:id
```

### Reorder Columns
```
PUT /columns/reorder
Body: { "boardId": string, "columnIds": string[] }
```

---

## Tasks

### Create Task
```
POST /tasks
Body: { "id": string, "content": string, "description"?: string, "priority": string, "columnId": string, "order": number, "sprintId"?: string, "dueDate"?: string }
```

### Update Task
```
PATCH /tasks/:id
Body: { "content"?: string, "description"?: string, "priority"?: string, "archived"?: boolean, "assigneeId"?: string, "tags"?: string[], "sprintId"?: string, "dueDate"?: string }
```

### Delete Task
```
DELETE /tasks/:id
```

### Move Task
```
PUT /tasks/:id/move
Body: { "columnId": string, "order": number }
```

### Assign Task to Sprint
```
PATCH /tasks/:id/sprint
Body: { "sprintId": string | null }
```

---

## Time Tracking

### Log Time
```
POST /tasks/:taskId/time-entries
Body: { "minutes": number, "date"?: string }
Response: { "id": string, "taskId": string, "userId": string, "userName"?: string, "minutes": number, "date": string, "createdAt": string }
```

### Get Time Entries
```
GET /tasks/:taskId/time-entries
Response: TimeEntry[]
```

### Delete Time Entry
```
DELETE /time-entries/:id
```

---

## Sprint Reports

### Get Sprint Report
```
GET /boards/:boardId/sprint-reports?sprintId=:sprintId
Response: {
  "sprintId": string,
  "sprintName": string,
  "startDate": string,
  "endDate": string,
  "totalEstimated": number,
  "totalLogged": number,
  "taskCount": number,
  "tasks": [{ "taskId": string, "content": string, "estimatedMinutes": number | null, "loggedMinutes": number, "variance": number }]
}
```

---

## Subtasks

### Create Subtask
```
POST /subtasks
Body: { "content": string, "checklistId": string, "priority"?: "LOW" | "MEDIUM" | "HIGH" }
```

### Update Subtask
```
PATCH /subtasks/:id
Body: { "content"?: string, "completed"?: boolean, "priority"?: string, "order"?: number }
```

### Delete Subtask
```
DELETE /subtasks/:id
```

### Toggle Subtask
```
PATCH /subtasks/:id/toggle
```

### Reorder Subtasks
```
PATCH /subtasks/reorder
Body: { "checklistId": string, "orderedIds": string[] }
```

---

## Checklists

### Add Checklist to Task
```
POST /tasks/:taskId/checklists
Body: { "title": string, "taskId": string }
```

### Update Checklist
```
PATCH /checklists/:id
Body: { "title": string }
```

### Delete Checklist
```
DELETE /checklists/:id
```

---

## Sprints

### List Sprints by Board
```
GET /sprints/boards/:boardId
Response: Sprint[]   (non-archived only)
```

### Get Active Sprint for Board
```
GET /sprints/boards/:boardId/active
Response: Sprint | null
```

### Get Sprint by ID
```
GET /sprints/:id
Response: Sprint | null
```

### Create Sprint
```
POST /sprints
Body: { "name": string, "boardId": string, "startDate": string, "endDate": string, "color"?: string }
```

### Update Sprint
```
PATCH /sprints/:id
Body: { "name"?: string, "startDate"?: string, "endDate"?: string, "color"?: string }
```

### Activate Sprint
```
POST /sprints/:id/activate
```

### Archive Sprint
```
POST /sprints/:id/archive
```

### Delete Sprint
```
DELETE /sprints/:id
```

---

## Comments

### Add Comment
```
POST /tasks/:taskId/comments
Body: { "content": string }
```

---

## Users

### Get Current User
```
GET /users/me
```

### Invite User
```
POST /users/invite
Body: { "email": string, "role": "ADMIN" | "MEMBER" }
```

### Accept Invitation
```
POST /users/accept-invitation
Body: { "token": string }
```

### List My Notification Prefs
```
GET /users/me/notification-prefs
Response: [{ "id": string, "userId": string, "type": "ASSIGNMENT" | "MENTION" | "SPRINT_STATUS" | "DUE_DATE", "inAppEnabled": boolean }]
```

### Upsert My Notification Pref
```
PUT /users/me/notification-prefs/:type
Body: { "inAppEnabled": boolean }
Response: { "id": string, "userId": string, "type": string, "inAppEnabled": boolean }
```

The `:type` path parameter is validated against the closed `NotificationType` enum at the controller boundary — unknown values return `400 Bad Request` without reaching the use case.

---

## Notifications

### List My Notifications
```
GET /notifications?limit=20&cursor=<id>&unreadOnly=false
Response: {
  "items": [{
    "id": string,
    "type": "ASSIGNMENT" | "MENTION" | "SPRINT_STATUS" | "DUE_DATE",
    "title": string,
    "body": string | null,
    "refType": "task" | "sprint",
    "refId": string,
    "boardId": string | null,
    "actorId": string | null,
    "milestone": string | null,
    "readAt": string | null,
    "createdAt": string
  }],
  "nextCursor": string | null
}
```

### Unread Count
```
GET /notifications/unread-count
Response: { "count": number }
```

### Mark One as Read
```
PATCH /notifications/:id/read
Response: Notification
```

### Mark All as Read
```
POST /notifications/mark-all-read
Response: { "updated": number }
```

### WebSocket (Socket.IO)

Connect to `http://localhost:3000` with `auth: { token: <jwt> }`. On `notification` event, the payload is a flat object — `actor` is split into `actorId` and `actorName` rather than nested.

```
Client -> Server: connect with { auth: { token: <jwt> } }
Server -> Client: 'notification' {
  id, type, title, body, refType, refId, boardId,
  actorId, actorName, milestone, readAt, createdAt
}
```

A connection without a valid token is rejected with `WsException('Unauthorized')`.