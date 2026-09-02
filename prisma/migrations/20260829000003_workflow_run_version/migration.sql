-- Add version column to WorkflowRun for optimistic locking.
-- Existing rows will have version 0 (the default), which is safe because
-- the pipeline code treats missing/0 versions as "first write".
ALTER TABLE "WorkflowRun" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
