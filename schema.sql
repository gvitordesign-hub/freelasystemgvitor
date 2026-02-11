-- GVITOR SYSTEM DATABASE SCHEMA

-- 1. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_value DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Pendente', -- 'Pago', 'Pendente'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL, -- 'Entrada', 'Saída'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Pendente', -- 'Pago', 'Pendente'
  category TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Budgets
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Albums (Portfolio)
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  cover_image TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. User Settings / Stats
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Usually one row or per user
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial record for user_settings if not exists
INSERT INTO user_settings (name, bio, whatsapp) 
VALUES ('G-Vitor Admin', 'Desenvolvedor & Designer Freelancer', '5511999999999')
ON CONFLICT DO NOTHING;

-- Seed services
INSERT INTO services (name, description, base_value) VALUES
('Logotipo Profissional', 'Criação de marca com manual básico', 800),
('Social Media (Pack 12)', 'Artes para feed e stories', 1200),
('Landing Page High-Convert', 'Design e desenvolvimento React', 2500)
ON CONFLICT DO NOTHING;
