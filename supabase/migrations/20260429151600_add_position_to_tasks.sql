-- Migration: Add position column to tasks table for Kanban drag-and-drop ordering

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Backfill position for existing tasks (ordered by created_at within each day column)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, day, date ORDER BY created_at) - 1 AS rn
  FROM tasks
)
UPDATE tasks
SET position = ranked.rn
FROM ranked
WHERE tasks.id = ranked.id;
