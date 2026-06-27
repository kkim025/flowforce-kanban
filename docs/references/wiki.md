# Wiki Reference

## Overview

Every board has a Markdown wiki. A wiki space is **lazy-created on first access** via `WikiService.getOrCreateSpace(boardId)` — the controller calls this before returning the tree so empty boards still resolve cleanly. Pages are organized as an adjacency-list tree (root pages have `parentId = null`) and rendered with the same `react-markdown + remark-gfm + rehype-sanitize` pipeline that powers task descriptions. Each save writes an append-only `WikiPageVersion` row, and pages can be soft-archived (recycle bin) or hard-deleted.

## Data Model

Defined in [`api/prisma/schema.prisma`](../../api/prisma/schema.prisma).

### `WikiSpace`

One space per board, 1:1 with `Board` via a unique `boardId`. Cascades on board delete.

```prisma
model WikiSpace {
  id        String   @id @default(uuid())
  boardId   String   @unique
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  pages     WikiPage[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### `WikiPage`

The page is the markdown document. `slug` is unique within `(spaceId, parentId)`. The recycle bin fields (`archived`, `archivedAt`, `archivedById`) are first-class; hard-delete is a separate destructive op gated by the `?hard=true` query flag.

```prisma
model WikiPage {
  id           String   @id @default(uuid())
  spaceId      String
  parentId     String?
  slug         String
  title        String
  content      String
  order        Int      @default(0)
  archived     Boolean  @default(false)
  archivedAt   DateTime?
  archivedById String?
  createdById  String
  updatedById  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  space      WikiSpace @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  parent     WikiPage? @relation("WikiPageTree", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children   WikiPage[] @relation("WikiPageTree")
  versions   WikiPageVersion[]
  createdBy  User     @relation("WikiPageCreator", fields: [createdById], references: [id])
  updatedBy  User     @relation("WikiPageUpdater", fields: [updatedById], references: [id])
  archivedBy User?    @relation("WikiPageArchiver", fields: [archivedById], references: [id], onDelete: SetNull)

  @@unique([spaceId, parentId, slug])
}
```

Slug collisions on rename or restore are handled with **auto-suffix** (`-2`, `-3`, …) inside the same `(spaceId, parentId)` namespace, mirroring the convention used elsewhere for board column titles.

### `WikiPageVersion`

Append-only history. `revisionNo` is monotonic per page; `(pageId, revisionNo)` is unique.

```prisma
model WikiPageVersion {
  id         String   @id @default(uuid())
  pageId     String
  revisionNo Int
  title      String
  content    String
  editorId   String
  createdAt  DateTime @default(now())
  page       WikiPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
  editor     User     @relation("WikiPageVersionEditor", fields: [editorId], references: [id])

  @@unique([pageId, revisionNo])
  @@index([pageId, createdAt])
}
```

## Permission Rules

Permissions are delegated to `WikiPermissionService` ([`api/src/modules/wiki/permission.service.ts`](../../api/src/modules/wiki/permission.service.ts)), which mirrors the board ACL from [`api/src/modules/board-sharing/`](../../api/src/modules/board-sharing). There is no wiki-only role in MVP — wiki access is fully derived from board access.

| Board permission | Wiki access |
|------------------|-------------|
| `BOARD.VIEW` (board member) | Read pages and versions |
| `BOARD.EDIT` (board member with edit role) | Create / update / move / restore-from-trash / restore-version |
| `BOARD.ADMIN` (board owner or admin member) | Soft-archive and **hard-delete** pages |

Membership lookups reuse `IBoardSharingRepository.findMemberByBoardAndUser` so the rules cannot drift between wiki and board-sharing.

## API Surface

Wiki endpoints are mounted at `boards/:boardId/wiki/...` so the permission model can key off the board ACL. All routes are JWT-guarded. See [`api/src/modules/wiki/wiki.controller.ts`](../../api/src/modules/wiki/wiki.controller.ts).

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| `GET`    | `/boards/:boardId/wiki` | VIEW | Page tree (nested children). Lazy-creates the space. |
| `GET`    | `/boards/:boardId/wiki/trash` | VIEW | Archived pages with breadcrumb. |
| `POST`   | `/boards/:boardId/wiki/pages` | EDIT | Create page. Writes version 1 in the same transaction. |
| `GET`    | `/boards/:boardId/wiki/pages/:pageId` | VIEW | Single page. |
| `PATCH`  | `/boards/:boardId/wiki/pages/:pageId` | EDIT | Update. Writes a new version and prunes. |
| `POST`   | `/boards/:boardId/wiki/pages/:pageId/move` | EDIT | Change parent / `order`. |
| `DELETE` | `/boards/:boardId/wiki/pages/:pageId` | EDIT (soft) / ADMIN (hard) | Without `?hard=true` soft-archives; with `?hard=true` permanently deletes. |
| `POST`   | `/boards/:boardId/wiki/pages/:pageId/restore` | EDIT | Restore from trash. Auto-suffixes slug on collision. |
| `GET`    | `/boards/:boardId/wiki/pages/:pageId/versions` | VIEW | List versions. `?limit=` accepts 50 / 100 / 200 / 0 (All). |
| `POST`   | `/boards/:boardId/wiki/pages/:pageId/versions/:versionId/restore` | EDIT | Restore a specific version as a new edit. |

## Frontend Surface

Routes are mounted in [`web/src/App.tsx`](../../web/src/App.tsx) under `boards/:boardId/wiki`. Routes are intentionally top-level rather than nested under `Board.tsx` so the wiki has its own layout.

```
/boards/:boardId/wiki           — index + read view (tree + pane)
/boards/:boardId/wiki/:pageId   — read or edit (toggled via local state)
/boards/:boardId/wiki/trash     — recycle bin
```

### Components

All under [`web/src/components/wiki/`](../../web/src/components/wiki).

- **`WikiLayout.tsx`** — top-level route component. Loads the page tree once per board visit; decides what to render in the right pane based on the URL (index / `:pageId` read / `:pageId` edit / `trash`). Edit mode is local state, not a URL, so the back button stays predictable.
- **`WikiSidebar.tsx`** — recursive tree (`TreeItem`) with expand / collapse per node. Active page (matching the `:pageId` param) is highlighted. Footer link goes to `/trash`.
- **`WikiPageView.tsx`** — read view. Renders the markdown with `ReactMarkdown + remarkGfm + rehypeSanitize`. Header action row: History (slide-out panel), Edit, Archive (soft). History panel has a `<select>` for the version-window dropdown (`WIKI_VERSION_OPTIONS`).
- **`WikiPageEdit.tsx`** — edit view. Reuses `MarkdownEditor` for the body. Top action row has Cancel + Save. Uses the parent's `initialPage` (loaded by `WikiLayout`) so the form skips a redundant `getWikiPage` fetch.
- **`WikiNewPageForm.tsx`** — full-pane create form. Plain `<textarea>` (not `MarkdownEditor`) for the empty-content first draft. Layout mirrors `WikiPageEdit` so create feels like edit.
- **`WikiTrash.tsx`** — recycle bin view. Lists archived pages with breadcrumb of original location. Per-row Restore and "Delete forever" actions. Hard-delete uses a modal that requires typing the page title (same confirmation pattern as board-delete elsewhere in the app).

The space is **not** auto-populated with a Welcome page on first visit — empty boards render the `WIKI_EMPTY` empty state with a "New page" button. (The "Welcome" auto-create intent in the original proposal is recorded but not implemented in the current code; only the space itself is lazy-created.)

## Versioning

- Every successful save (`POST /pages` or `PATCH /pages/:pageId`) appends a new `WikiPageVersion` row with `revisionNo = max + 1` in the same Prisma transaction.
- The default cap is `DEFAULT_WIKI_VERSION_LIMIT = 50` versions per page, defined in [`api/src/modules/wiki/wiki.service.ts`](../../api/src/modules/wiki/wiki.service.ts). On every save, the same transaction deletes oldest revisions beyond the cap so retention does not drift.
- Restoring a version writes the historical content as a new edit (so the restore itself is captured as a new revision) and prunes again.
- The history dropdown (`WIKI_VERSION_OPTIONS` in `web/src/types/wiki.ts`) exposes `50 / 100 / 200 / All`. `All` is mapped to `?limit=0` server-side, which is hard-capped at `WIKI_VERSION_ALL_CEILING = 1_000` to bound the worst-case response.

## Recycle Bin

Implemented via three soft-archive fields on `WikiPage`:

- `archived: Boolean` — gate for tree vs. trash views.
- `archivedAt: DateTime?` — set on archive, cleared on restore; surfaced in the trash UI as "Archived {date}".
- `archivedById: String?` — set on archive, used for "archived by" display.

### Restore

`POST /pages/:pageId/restore` sets `archived = false`, clears `archivedAt`, and returns the page to its original parent. If a sibling now occupies the same slug, auto-suffix is applied — the same rule as rename.

### Hard Delete

`DELETE /pages/:pageId?hard=true` permanently removes the page row. Versions cascade via the FK. Requires `BOARD.ADMIN`. The UI gate is in [`web/src/components/wiki/WikiTrash.tsx`](../../web/src/components/wiki/WikiTrash.tsx): a modal that requires the user to type the page title before the Delete button enables.

## Reused Assets

- **`web/src/components/MarkdownEditor.tsx`** — write / preview tabs, toolbar (bold, italic, link, code, list, etc.). Drop-in via `value` + `onChange(value: string)`.
- **`react-markdown` + `remark-gfm` + `rehype-sanitize`** — already in `web/package.json` for task descriptions. `WikiPageView` uses the same plugin set so sanitization behavior cannot drift.
- **Board-sharing permission pattern** — `WikiPermissionService` injects the shared `IBoardSharingRepository` for membership lookups. Same ACL, same `PermissionLevel` enum, same admin rules.
- **Confirmation modal pattern** — `WikiTrash` requires a typed-title confirmation for hard-delete, mirroring the pattern used elsewhere in the app for destructive ops.

## Future Work

The data model is shaped so MCP / AI tooling can land in a follow-up PR without a schema rewrite. None of the items below are implemented today:

- **MCP server tools** — `content` stays markdown source-of-truth, so an MCP tool can return raw markdown or run a server-side renderer when it needs HTML in tool responses.
- **Version diffs / history queries** — `WikiPageVersion` is append-only and indexed by `(pageId, createdAt)`, which is the shape an MCP `get_history` / `get_diff` tool needs.
- **Per-board doc enumeration** — wiki is 1:1 with `Board`, so an MCP server can enumerate a board's docs in a single query against `WikiSpace.boardId`.

Explicitly out of scope: cross-board pages, wiki templates, attachments, image uploads, page-level ACL, RAG, embeddings, semantic search.