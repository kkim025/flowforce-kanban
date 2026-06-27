# Database Schema Reference

PostgreSQL via Prisma ORM. Connection: `postgresql://postgres:password@localhost:5432/flowforce`

---

## Entity Relationship

```
User (1) ─── (N) Board
User (1) ─── (N) Notification (recipient)
User (1) ─── (N) Notification (actor, nullable)
User (1) ─── (N) UserNotificationPref
Board (1) ─── (N) Column
Board (1) ─── (N) Sprint
Board (1) ─── (N) Notification (nullable, for future ACL scoping)
Column (1) ─── (N) Task
Task (1) ─── (N) Checklist
Task (1) ─── (N) Subtask (via taskId - deprecated path)
Task (1) ─── (N) Comment
Task (1) ─── (N) Activity
Task (1) ─── (N) TimeEntry
Task (N) ─── (1) User (assignee)
Checklist (1) ─── (N) Subtask (via checklistId - primary path)
Comment (N) ─── (1) User
Activity (N) ─── (1) User
TimeEntry (N) ─── (1) User
Sprint (1) ─── (N) Task
```

---

## Models

### User
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| email | String | Unique |
| password | String | BCrypt hashed |
| name | String? | |
| role | Role | ADMIN, MEMBER |
| status | UserStatus | ACTIVE, PENDING, INACTIVE |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Invitation
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| email | String | Unique |
| token | String | Unique |
| role | Role | Default MEMBER |
| expiresAt | DateTime | |
| createdAt | DateTime | |

### Board
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| title | String | |
| ownerId | String | FK → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Column
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| title | String | |
| order | Int | For sorting |
| wipLimit | Int? | Work-in-progress limit |
| boardId | String | FK → Board (Cascade delete) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Sprint
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| name | String | |
| startDate | DateTime | |
| endDate | DateTime | |
| status | SprintStatus | PLANNING, ACTIVE, COMPLETED, ARCHIVED |
| boardId | String | FK → Board (Cascade delete) |
| color | String? | Optional color code |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Task
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| content | String | Title/content |
| description | String? | |
| priority | Priority | LOW, MEDIUM, HIGH |
| tags | String[] | |
| order | Int | For sorting within column |
| columnId | String | FK → Column (Cascade delete) |
| archived | Boolean | Default false |
| assigneeId | String? | FK → User |
| sprintId | String? | FK → Sprint |
| estimatedMinutes | Int? | Time tracking - estimated time |
| dueDate | DateTime? | Optional due date |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Indices:**
- `@@index([dueDate, assigneeId, archived])` — backs the `DueDateScanner` query `WHERE dueDate IN window AND assigneeId IS NOT NULL AND archived = false`. Without it, the scanner degrades to a sequential scan on the tasks table as data grows.

### TimeEntry
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| taskId | String | FK → Task (Cascade delete) |
| userId | String | FK → User |
| minutes | Int | Logged duration in minutes |
| date | DateTime | Day of the work |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Checklist
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| title | String | |
| taskId | String | FK → Task (Cascade delete) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Subtask
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| content | String | |
| completed | Boolean | Default false |
| order | Int | Default 0 |
| priority | Priority? | Optional - inherits from parent task |
| checklistId | String? | FK → Checklist (Cascade delete) |
| taskId | String? | FK → Task (Cascade delete) - DEPRECATED |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Comment
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| content | String | |
| taskId | String | FK → Task (Cascade delete) |
| userId | String | FK → User |
| mentionedUserIds | String[] | Resolved @mentions on save (default: `[]`) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Activity
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| type | String | Activity type identifier |
| details | Json? | Activity-specific data |
| taskId | String | FK → Task (Cascade delete) |
| userId | String | FK → User |
| createdAt | DateTime | |

---

## Enums

```prisma
enum Role { ADMIN, MEMBER }
enum UserStatus { ACTIVE, PENDING, INACTIVE }
enum Priority { LOW, MEDIUM, HIGH }
enum SprintStatus { PLANNING, ACTIVE, COMPLETED, ARCHIVED }
enum BoardStatus { ACTIVE, ARCHIVED }
enum NotificationType { ASSIGNMENT, MENTION, SPRINT_STATUS, DUE_DATE }
```

---

## Notifications (real-time inbox)

### Notification
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| recipientId | String | FK → User (Cascade delete) |
| actorId | String? | FK → User (SetNull), null for system events (due-date) |
| type | NotificationType | ASSIGNMENT, MENTION, SPRINT_STATUS, DUE_DATE |
| title | String | Pre-rendered headline, e.g. `Alice assigned you "Fix bug"` |
| body | String? | Optional detail line |
| refType | String | `task` \| `sprint` |
| refId | String | ID of the referenced entity |
| boardId | String? | FK → Board (SetNull), for future board-scoped filtering |
| milestone | String? | `24h` \| `1h` \| `due` — de-dup key for due-date reminders |
| readAt | DateTime? | Null = unread |
| createdAt | DateTime | |

**Indices:**
- `@@index([recipientId, readAt])` — for "unread for me"
- `@@index([recipientId, createdAt])` — for "recent for me"

**Unique constraint:**
- `@@unique([recipientId, type, refId, milestone])` — prevents the same due-date reminder from firing twice for the same user on the same task at the same milestone.
  - *Postgres semantics:* `NULL` values are treated as distinct in unique indexes, so this constraint is effectively a no-op for non-due-date notifications (where `milestone` is `null`). That is **intentional**: if a task is unassigned and re-assigned, the assignee should get a new ASSIGNMENT notification each time. The de-dup only applies when `milestone` is non-null (i.e. due-date events).

### UserNotificationPref
| Field | Type | Notes |
|-------|------|-------|
| id | String (uuid) | PK |
| userId | String | FK → User (Cascade delete) |
| type | NotificationType | ASSIGNMENT, MENTION, etc. |
| inAppEnabled | Boolean | Default true |

**Unique:** `@@unique([userId, type])`. No row = allowed (most-permissive default; only explicit mutes are persisted).

See [api-endpoints.md](./api-endpoints.md) for the REST endpoints that read/write these, and the design spec for the full feature context.

---

## Cascading Deletes

- Board → Column → Task → (Checklist → Subtask, Subtask, Comment, Activity)
- Task → Checklist → Subtask (via checklistId)
- Task → Subtask (via taskId, deprecated path)
- Task → Comment → User
- Task → Activity → User
- User → Notification (recipient) (Cascade)
- User → Notification (actor) (SetNull)
- User → UserNotificationPref (Cascade)
- Board → Notification (boardId) (SetNull)