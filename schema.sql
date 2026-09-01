-- =====================================================================
-- GVITOR SYSTEM - SCHEMA COMPLETO (referência)
-- Todas as tabelas possuem isolamento por usuário (user_id) e RLS
-- habilitado com policies estritas: auth.uid() = user_id
-- =====================================================================

-- 1. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  contact TEXT,
  notes TEXT,
  xp INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Ativo',
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Services (catálogo)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_value DECIMAL(12, 2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Invoices (notas)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Pendente', -- 'Pago', 'Pendente'
  notes TEXT,
  custom_value DECIMAL(12, 2) DEFAULT NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks (demandas)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  value DECIMAL(12, 2) DEFAULT 0,
  day TEXT, -- 'Segunda', etc.
  date DATE,
  status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Em Andamento', 'Concluído'
  category TEXT,
  briefing TEXT,
  add_to_portfolio BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  deliverables JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transactions (financeiro)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL, -- 'Entrada', 'Saída'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Pendente', -- 'Pago', 'Pendente'
  category TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Budgets (orçamentos/propostas)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]'::jsonb,
  discount DECIMAL(12, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percent', -- 'percent', 'fixed'
  down_payment DECIMAL(12, 2) DEFAULT 0,
  validity_days INTEGER DEFAULT 30,
  terms TEXT,
  status TEXT DEFAULT 'Draft', -- 'Draft', 'Sent', 'Approved', 'Rejected'
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  type TEXT DEFAULT 'task', -- 'finance', 'task'
  completed BOOLEAN DEFAULT FALSE,
  linked_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  date DATE,
  time TIME,
  alert_before INTEGER, -- minutos
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Albums (Portfolio)
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  cover_image TEXT,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Portfolio Assets
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'image', -- 'image', 'video'
  url TEXT NOT NULL,
  description TEXT,
  video_provider TEXT, -- 'youtube', 'vimeo'
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. User Settings / Stats
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  weekly_goal DECIMAL(12, 2) DEFAULT 2000,
  monthly_goal DECIMAL(12, 2) DEFAULT 8000,
  annual_goal DECIMAL(12, 2) DEFAULT 100000,
  task_goal INTEGER DEFAULT 10,
  client_goal INTEGER DEFAULT 5,
  streak INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  last_briefing_date DATE,
  pix_key TEXT,
  objectives TEXT,
  theme_color TEXT DEFAULT 'purple',
  bio TEXT,
  name TEXT,
  whatsapp TEXT,
  portfolio_logo TEXT,
  portfolio_favicon TEXT,
  behance_link TEXT,
  instagram_link TEXT,
  portfolio_categories JSONB DEFAULT '["Social Media", "Motion Design", "Identidade Visual", "Web Design"]'::jsonb,
  social_links JSONB DEFAULT '[]'::jsonb,
  overdue_alert_days INTEGER DEFAULT 30,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Holidays (dias bloqueados)
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT holidays_date_user_unique UNIQUE (date, user_id)
);

-- =====================================================================
-- RLS (Row Level Security) - ISOLAMENTO ESTRITO POR USUÁRIO
-- IMPORTANTE: NUNCA adicione policies que permitam o role anon ou um
-- UUID "dev" de fallback. Isso expõe TODOS os dados publicamente.
-- =====================================================================
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

-- =====================================================================
-- Automação: cria user_settings para cada novo usuário
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- Constraints extras
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_settings_user_id_unique'
    ) THEN
        ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);
    END IF;
END $$;
