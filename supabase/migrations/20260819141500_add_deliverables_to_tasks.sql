-- Migration: Add deliverables column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;
