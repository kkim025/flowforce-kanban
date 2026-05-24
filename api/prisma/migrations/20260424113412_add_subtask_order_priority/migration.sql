-- Add order and priority fields to Subtask
ALTER TABLE "Subtask" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subtask" ADD COLUMN "priority" "Priority";