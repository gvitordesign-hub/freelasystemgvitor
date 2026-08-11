-- =================================================================
-- Migration: Harden RLS - Remove anonymous/dev fallback bypass
-- Date: 2026-08-11
--
-- PROBLEMA DE SEGURANCA (CRITICO):
-- As policies "dev_access_*" concediam acesso TOTAL (SELECT/INSERT/
-- UPDATE/DELETE) para QUALQUER role - incluindo o role anon (nao
-- autenticado) - sempre que user_id fosse igual ao UUID de fallback
-- '00000000-0000-0000-0000-000000000000'. Como a anon key e publica
-- (embutida no bundle do cliente), qualquer pessoa sem login podia
-- ler, alterar e apagar TODOS os dados do usuario dono.
--
-- CORRECAO:
-- Remove as policies dev e cria policies estritas de isolamento por
-- usuario (auth.uid() = user_id), com USING e WITH CHECK.
-- =================================================================

BEGIN;

-- 1. Remove insecure dev_access policies
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
DROP POLICY IF EXISTS "dev_access_holidays" ON holidays;

-- 2. Drop legacy permissive policies (idempotent)
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

-- 3. Ensure RLS is enabled on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- 4. Strict user isolation policies (authenticated users only)
CREATE POLICY "user_isolation_clients" ON clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_services" ON services FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_invoices" ON invoices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_tasks" ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_transactions" ON transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_budgets" ON budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_reminders" ON reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_albums" ON albums FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_portfolio_assets" ON portfolio_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_user_settings" ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_isolation_holidays" ON holidays FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Remove dev fallback user_settings seed (unused/unsafe leftover)
DELETE FROM user_settings
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

COMMIT;
