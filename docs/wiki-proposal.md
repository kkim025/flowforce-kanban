# Wiki Feature — Proposal

> Companion to upcoming GitHub issue. Read this first, then the issue tracks the same content for discussion.

## TL;DR

Add a per-board **Wiki** so teams can write long-form docs in Markdown. Reuse the existing
`MarkdownEditor` and GFM pipeline (`react-markdown` + `remark-gfm` + `rehype-sanitize`) that
already powers task descriptions — no new rich-text work needed. Scope this PR is **MVP**:
CRUD + a tree of pages + version history. **MCP / AI tooling is explicitly out of scope**
for this PR but the data model is shaped so it slots in later.

## Existing assets we will reuse (investigation findings)

- `web/src/components/MarkdownEditor.tsx` — write/preview tabs, toolbar, autosave-friendly,
  takes `value` + `onChange(value: string)`. Drop-in.
- `web/src/components/InlineDescriptionEditor.tsx` — read-only `ReactMarkdown` preview
  pattern for "view without edit mode".
- `web/package.json` already ships `react-markdown@10`, `remark-gfm@4`, `rehype-sanitize@6`.
  No new deps needed for rendering.
- `api/prisma/schema.prisma` — `Board` already has the `members` / `shares` relation graph
  that drives permission checks. We can mirror it for wiki pages instead of inventing a
  new ACL.
- `api/src/modules/board-sharing/` + `permission.service.ts` — the pattern to copy
  (`@UseGuards(JwtAuthGuard)`, `GetUser('sub')`, then delegate to a permission service
  that knows about `PermissionLevel.VIEW` / `EDIT` and `BoardMemberRole`).
- App routing (`web/src/App.tsx`) follows `board/:boardId/...` — wiki fits naturally as
  `/board/:boardId/wiki` + `/board/:boardId/wiki/:pageSlug`.

No MCP/AI code exists in the repo today (`grep` for `mcp|MCP|openai|anthropic|claude`
returns zero hits under `src/`). That is a future effort — see *Forward compatibility*.

## Data model (Prisma additions)

```prisma
// One space per board. Wiki is always board-scoped — no cross-board pages in MVP.
model WikiSpace {
  id          String     @id @default(uuid())
  boardId     String     @unique        // 1:1 with Board for MVP
  board       Board      @relation(fields: [boardId], references: [id], onDelete: Cascade)
  pages       WikiPage[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

// Page is the markdown doc. Tree is encoded by `parentId` (adjacency list).
// Slug is URL-safe + unique within the parent. Root pages have parentId = null.
model WikiPage {
  id          String     @id @default(uuid())
  spaceId     String
  parentId    String?
  slug        String                       // derived from title, unique within (spaceId, parentId)
  title       String
  content     String                       // markdown source of truth
  order       Int        @default(0)
  archived    Boolean    @default(false)
  createdById String
  updatedById String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  space       WikiSpace  @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  parent      WikiPage?  @relation("WikiPageTree", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children    WikiPage[] @relation("WikiPageTree")
  versions    WikiPageVersion[]
  createdBy   User       @relation("WikiPageCreator",  fields: [createdById], references: [id])
  updatedBy   User       @relation("WikiPageUpdater",  fields: [updatedById], references: [id])

  @@unique([spaceId, parentId, slug])
  @@index([spaceId, parentId, order])
  @@index([spaceId, archived, updatedAt])
}

// Append-only history. Every save writes a version row. MVP keeps them indefinitely;
// a future cleanup cron can prune > N versions per page.
model WikiPageVersion {
  id          String   @id @default(uuid())
  pageId      String
  revisionNo  Int                          // monotonic per page
  title       String
  content     String
  editorId    String
  createdAt   DateTime @default(now())
  page        WikiPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
  editor      User     @relation(fields: [WikiPageVersionEditor": [id])

  @@unique([pageId, revisionNo])
  @@index([pageId, createdAt])
}
```

Notes:
- Adjacency-list tree keeps the model trivial; if we ever want deeper features
  (move-subtree, breadcrumbs for huge trees) we can add a `path` materialized column.
- `content` is markdown (the source of truth). Rendering happens client-side via
  `react-markdown`. No pre-rendered HTML column → no sanitization drift between
  server and client.
- New `User` back-relations are additive only.

## API surface

NestJS module `wiki/` mirroring `board-sharing/` layout (controller + service +
`application/`, `domain/`, `infrastructure/`). All routes are JWT-guarded.

```
GET    /boards/:boardId/wiki                    tree (pages) + recent updates
POST   /boards/:boardId/wiki/pages              create page
GET    /boards/:boardId/wiki/pages/:pageId      read page + breadcrumbs
PATCH  /boards/:boardId/wiki/pages/:pageId      update (writes new version)
DELETE /boards/:boardId/wiki/pages/:pageId      archive (soft delete)
POST   /boards/:boardId/wiki/pages/:pageId/move  change parent / order
GET    /boards/:boardId/wiki/pages/:pageId/versions
GET    /boards/:boardId/wiki/versions/:versionId
POST   /boards/:boardId/wiki/pages/:pageId/restore/:versionId
```

Permission rule (single source of truth, lives next to `permission.service.ts`):
- `BOARD.VIEW` → can `GET` pages and versions.
- `BOARD.EDIT` → can create / update / move / restore.
- `BOARD.ADMIN` (board owner or `BoardMemberRole.ADMIN`) → can archive / delete.

We do **not** introduce a wiki-only role in MVP. Mirror board ACL.

## Frontend surface

- New route group `board/:boardId/wiki/*` added in `web/src/App.tsx`.
- `WikiLayout.tsx` — left sidebar tree (collapsible), right pane = page view/edit.
- Reuse `MarkdownEditor` for editing, plain `ReactMarkdown + remark-gfm + rehypeSanitize`
  for the read view (same pattern as `InlineDescriptionEditor.tsx`).
- Page header shows `updatedAt`, `updatedBy`, and a "History" button.
- Empty board auto-creates a `Welcome` page on first visit (idempotent).
- Toast/notification pipeline already supports this; we surface "page edited" as
  in-app notifications on collaborators.

## Forward compatibility — AI / MCP later

The proposal leaves three deliberate hooks so a follow-up PR can ship MCP/AI tooling
without a schema rewrite:

1. **`content` stays markdown source-of-truth.** An MCP tool can return the markdown
   directly, or run a server-side renderer (e.g. `remark` + `rehype-sanitize`) when
   it needs to embed HTML in tool responses.
2. **`WikiPageVersion` is append-only + indexed by `(pageId, createdAt)`** — perfect
   for an MCP `get_history` / `get_diff` tool later.
3. **Wiki is board-scoped (1:1 with `Board`).** When an MCP server needs to enumerate
   docs for a board, it's a single query against `WikiSpace.boardId`.

Out of scope for this PR (recorded so we don't scope-creep):
- MCP server, AI agent, RAG, embeddings, semantic search.
- Cross-board / global wiki pages.
- Wiki templates, attachments, image uploads, code-block syntax highlighting beyond GFM.
- Page-level ACL (only board-level ACL in MVP).

## Test plan

- API:
  - `wiki.service.spec.ts` — create/read/update/archive/restore, slug uniqueness,
    cascade from `Board` delete.
  - `wiki.e2e-spec.ts` — permission matrix against JWT tokens (no auth / VIEW / EDIT /
    ADMIN). Same shape as the existing board-sharing e2e.
- Web:
  - `WikiSidebar.test.tsx` — tree rendering, expand/collapse, active highlight.
  - `WikiPageView.test.tsx` — markdown renders, sanitization strips `<script>`.
  - `WikiPageEdit.test.tsx` — uses the existing `MarkdownEditor`; just verify the
    save callback fires and the version list updates.
- CI: `ci.yml` already runs Postgres + `prisma migrate deploy` + `npm test`. No
  workflow changes needed.

## Rollout / migration

- `prisma migrate dev --name add_wiki` generates the SQL.
- Seed script (`api/prisma/seed.ts`) is **not** updated for MVP — wiki is created
  lazily on first board visit.
- Feature flag in `web/src/lib/constants.ts` (`UI_LABELS.WIKI_ENABLED`) defaulting
  to `true` once merged; flip to `false` if we need to dark-launch.

## Estimated scope

Roughly: 1 Prisma migration, 1 new NestJS module, ~3 controllers, 1 service,
1 permission helper, ~4 React components, ~3 test files. Comfortably a single
`feature/wiki` branch off `development` for one PR — split MCP/AI into a
follow-up `feature/wiki-mcp` once MVP lands.

## Open questions — resolved

Answers from `kkim025` on issue #23 (2026-06-25):

1. **Tree depth:** **unbounded.** No depth cap in MVP. We still keep the
   `(spaceId, parentId, order)` index so sibling reorder + ancestor lookups
   stay cheap regardless of depth.
2. **Slug collisions on rename:** **auto-suffix.** Server increments `-2`,
   `-3`, … on conflict within the same `(spaceId, parentId)`. Mirror the
   existing repo convention used elsewhere (board column titles, etc.).
3. **Versioning:** **cap at 50 versions per page by default**, with a
   dropdown in the history UI to bump the visible window (50 / 100 / 200 /
   All). Pruning rule: when a page has > 50 versions, the oldest beyond 50
   are deleted in the same transaction that writes version N+1. Reasonable
   default lives in `web/src/lib/constants.ts` (e.g. `WIKI_VERSION_PAGE_SIZE = 50`).
4. **Delete lifecycle:** **soft-archive first, like a recycle bin**, then
   the user can **hard-delete forever** from a `Trash` folder. See the
   *Recycle bin* section below — this is now a real UX surface, not just
   a flag.

## Recycle bin (new section, prompted by question 4)

Soft-archive is no longer just a boolean. It needs a first-class recovery
surface so users can restore or hard-delete from one place.

Schema impact (additive):

```prisma
// Already on WikiPage: `archived Boolean @default(false)` + `archivedAt DateTime?`
// We only need to add the timestamp so the Trash view can show "deleted N days ago".

model WikiPage {
  // ... existing fields ...
  archived    Boolean    @default(false)
  archivedAt  DateTime?               // set when archived, cleared on restore
  archivedById String?                 // who archived it (for "by me" filters)
  archivedBy   User?    @relation("WikiPageArchiver", fields: [archivedById], references: [id], onDelete: SetNull)
}

// Hard-delete is a destructive op; require explicit confirm + a typed
// page title match in the UI, mirroring how destructive ops are gated
// elsewhere in the app.
```

UX:
- A new **Trash** tab inside `WikiLayout` lists pages where `archived = true`,
  sorted by `archivedAt DESC`. Shows original location (breadcrumb of where
  it lived before archive) so the user knows what they're restoring.
- Actions in Trash:
  - **Restore** → sets `archived = false`, `archivedAt = null`. Page reappears
    at its original parent. If a sibling now occupies the same slug at that
    parent, auto-suffix on restore (same rule as rename).
  - **Delete forever** → hard `DELETE` row, **cascades to `WikiPageVersion`** by
    FK. UI requires typing the page title to confirm (same pattern as
    board-delete confirmations in the app).
- API additions (still under `/boards/:boardId/wiki`):
  ```
  GET    /boards/:boardId/wiki/trash                       # list archived
  POST   /boards/:boardId/wiki/pages/:pageId/restore       # undo archive
  DELETE /boards/:boardId/wiki/pages/:pageId?hard=true     # hard delete
  ```
  `hard=true` is gated on `BOARD.ADMIN` (board owner / `BoardMemberRole.ADMIN`).
  Regular `DELETE` (soft archive) requires `BOARD.EDIT`.

## Versioning UI (new section, prompted by question 3)

- `GET /versions?limit=50` (default), `limit=100`, `limit=200`, `limit=0`
  (all). `0` is the "All" option in the dropdown.
- Frontend: `<select>` in `WikiPageHistory.tsx`, default
  `WIKI_VERSION_PAGE_SIZE = 50`.
- Each entry: revision number, editor, `createdAt`, "Restore this version"
  button (writes current state as version N+1, then overwrites page to the
  chosen version — same transactional pattern as a normal save).

## Version pruning rule (new section, prompted by question 3)

- After every successful page save, in the same transaction:
  1. Insert new `WikiPageVersion` row with `revisionNo = max + 1`.
  2. `DELETE FROM WikiPageVersion WHERE pageId = ? AND id NOT IN (SELECT id FROM WikiPageVersion WHERE pageId = ? ORDER BY revisionNo DESC LIMIT 50)`.
- Cleanup only runs on save, not on a cron. If we ever care about orphaned
  over-cap versions on pages that go cold, a nightly job can do it.
- The "All" option in the history dropdown still has to be backed by a
  query — for now it's `LIMIT NULL` (Postgres returns everything). Capping
  at "All" being practical is fine until a page has thousands of versions.
