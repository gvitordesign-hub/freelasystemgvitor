-- =================================================================
-- Migration: Comprehensive Fixes for RLS, Constraints & Dev Access
-- =================================================================

-- 0. Ensure all required columns exist (previous migrations may not have been applied)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS overdue_alert_days INTEGER DEFAULT 30;

-- 1. Add UNIQUE constraint on user_settings.user_id
--    (Required for upsert with onConflict: 'user_id' to work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_settings_user_id_unique'
    ) THEN
        ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Drop existing restrictive RLS policies
--    These block all anon access because auth.uid() is NULL without a session
DROP POLICY IF EXISTS "Users can only see their own clients" ON clients;
DROP POLICY IF EXISTS "Users can only see their own services" ON services;
DROP POLICY IF EXISTS "Users can only see their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only see their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only see their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can only see their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can only see their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can only see their own albums" ON albums;
DROP POLICY IF EXISTS "Users can only see their own assets" ON portfolio_assets;
DROP POLICY IF EXISTS "Users can only see their own settings" ON user_settings;

-- Drop any previous dev policies (idempotent)
DROP POLICY IF EXISTS "dev_access_clients" ON clients;
DROP POLICY IF EXISTS "dev_access_services" ON services;
DROP POLICY IF EXISTS "dev_access_invoices" ON invoices;
DROP POLICY IF EXISTS "dev_access_tasks" ON tasks;
DROP POLICY IF EXISTS "dev_access_transactions" ON transactions;
DROP POLICY IF EXISTS "dev_access_budgets" ON budgets;
DROP POLICY IF EXISTS "dev_access_reminders" ON reminders;
DROP POLICY IF EXISTS "dev_access_albums" ON albums;
DROP POLICY IF EXISTS "dev_access_portfolio_assets" ON portfolio_assets;
DROP POLICY IF EXISTS "dev_access_user_settings" ON user_settings;

-- 3. Create new combined policies
--    For authenticated users: auth.uid() = user_id (production)
--    For anon role: allow access to the dev fallback user (development)
--    The application already filters by user_id in its queries

CREATE POLICY "dev_access_clients" ON clients FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_services" ON services FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_invoices" ON invoices FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_tasks" ON tasks FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_transactions" ON transactions FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_budgets" ON budgets FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_reminders" ON reminders FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_albums" ON albums FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_portfolio_assets" ON portfolio_assets FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "dev_access_user_settings" ON user_settings FOR ALL 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- 4. Ensure default user_settings row exists for the dev fallback user
INSERT INTO user_settings (user_id, name)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Desenvolvedor')
ON CONFLICT (user_id) DO NOTHING;

-- 5. Backfill any orphaned rows to the dev user
UPDATE clients SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE services SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE invoices SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE tasks SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE transactions SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE budgets SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE reminders SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE albums SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE portfolio_assets SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
