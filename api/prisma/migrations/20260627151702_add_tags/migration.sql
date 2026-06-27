-- Issue #32: Tag management — reified Tag entity + TaskTag join table.
-- Replaces `Task.tags String[]` with a per-board tag library.

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94a3b8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTag" (
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TaskTag_pkey" PRIMARY KEY ("taskId","tagId")
);

-- CreateIndex
CREATE INDEX "Tag_boardId_name_idx" ON "Tag"("boardId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_boardId_name_key" ON "Tag"("boardId", "name");

-- CreateIndex
CREATE INDEX "TaskTag_tagId_idx" ON "TaskTag"("tagId");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill (Postgres-specific):
--   1. distinct (boardId, lower(trim(tag_name))) pairs across all legacy Task.tags
--   2. insert one Tag per pair (default color #94a3b8 = slate-400)
--   3. insert TaskTag rows linking each task to its materialized tags
--
-- Empty / null / whitespace-only strings are skipped. Case variants in the
-- legacy free-form data collapse to one row because the unique index is on
-- lower(trim(name)) — except the index is exact-match. We deliberately
-- store lower(trim()) as the name so the join is case-insensitive going forward.
-- (Original-case display is out of scope for this migration; can be added later
-- by re-casing from a snapshot if anyone complains.)

WITH distinct_tag_pairs AS (
    SELECT DISTINCT
        c."boardId" AS "boardId",
        lower(trim(tag_name)) AS "name"
    FROM "Task" t
    JOIN "Column" c ON c."id" = t."columnId"
    CROSS JOIN LATERAL unnest(t.tags) AS tag_name
    WHERE t.tags IS NOT NULL
      AND array_length(t.tags, 1) > 0
      AND length(trim(tag_name)) > 0
),
created_tags AS (
    INSERT INTO "Tag" ("id", "boardId", "name", "color", "createdAt", "updatedAt")
    SELECT
        gen_random_uuid()::text,
        d."boardId",
        d."name",
        '#94a3b8',
        NOW(),
        NOW()
    FROM distinct_tag_pairs d
    ON CONFLICT ("boardId", "name") DO NOTHING
    RETURNING "id", "boardId", "name"
),
all_tags AS (
    -- Combine newly created tags with pre-existing ones (idempotency for re-runs).
    SELECT "id", "boardId", "name" FROM created_tags
    UNION
    SELECT "id", "boardId", "name" FROM "Tag"
)
INSERT INTO "TaskTag" ("taskId", "tagId")
SELECT DISTINCT
    t."id" AS "taskId",
    tag_row."id" AS "tagId"
FROM "Task" t
JOIN "Column" c ON c."id" = t."columnId"
CROSS JOIN LATERAL unnest(t.tags) AS raw_tag
JOIN all_tags tag_row
    ON tag_row."boardId" = c."boardId"
   AND tag_row."name" = lower(trim(raw_tag))
WHERE t.tags IS NOT NULL
  AND array_length(t.tags, 1) > 0
  AND length(trim(raw_tag)) > 0
ON CONFLICT ("taskId", "tagId") DO NOTHING;

-- DropLegacyColumn
ALTER TABLE "Task" DROP COLUMN "tags";