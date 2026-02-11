-- Migration: Add User Isolation and RLS Policies

-- 1. Add user_id column to all tables
DO $$ 
BEGIN
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE services ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE reminders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE albums ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Enable RLS on all tables
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

-- 3. Create RLS Policies
-- Clients
CREATE POLICY "Users can only see their own clients" ON clients FOR ALL USING (auth.uid() = user_id);
-- Services
CREATE POLICY "Users can only see their own services" ON services FOR ALL USING (auth.uid() = user_id);
-- Invoices
CREATE POLICY "Users can only see their own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
-- Tasks
CREATE POLICY "Users can only see their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
-- Transactions
CREATE POLICY "Users can only see their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
-- Budgets
CREATE POLICY "Users can only see their own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);
-- Reminders
CREATE POLICY "Users can only see their own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);
-- Albums
CREATE POLICY "Users can only see their own albums" ON albums FOR ALL USING (auth.uid() = user_id);
-- Portfolio Assets
CREATE POLICY "Users can only see their own assets" ON portfolio_assets FOR ALL USING (auth.uid() = user_id);
-- User Settings
CREATE POLICY "Users can only see their own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- 4. Initial settings trigger
-- Ensure a user_settings row exists for every user
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill user_id for existing data (if any)
-- Assuming the first logged in user should own existing data
UPDATE clients SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE services SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE invoices SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE tasks SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE transactions SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE budgets SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE reminders SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE albums SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE portfolio_assets SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE user_settings SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
