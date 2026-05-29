-- Migration: Create Holidays Table
-- Description: Adds a table to store holidays per user to block task scheduling and display in calendar.

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT holidays_date_user_unique UNIQUE (date, user_id)
);

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Drop existing if any (idempotent)
DROP POLICY IF EXISTS "dev_access_holidays" ON holidays;

-- Create unified RLS policy for holidays (handles authenticated prod users and dev fallback)
CREATE POLICY "dev_access_holidays" ON holidays FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);
