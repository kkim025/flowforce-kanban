-- Backs the DueDateScanner query in
-- src/modules/notifications/infrastructure/due-date.scanner.ts:
--   WHERE dueDate IN window AND assigneeId IS NOT NULL AND archived = false
-- Without this, the scanner degrades to a sequential scan on the tasks table
-- as it grows. Adds ~1 index entry per task; safe to add non-concurrently
-- because the table is small at this stage.
CREATE INDEX "Task_dueDate_assigneeId_archived_idx"
  ON "Task"("dueDate", "assigneeId", "archived");