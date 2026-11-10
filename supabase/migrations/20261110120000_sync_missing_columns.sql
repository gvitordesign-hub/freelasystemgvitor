-- =================================================================
-- Migration: Alinha o schema remoto com o código (colunas ausentes)
-- Data: 2026-11-10
--
-- Auditoria constatou que o banco remoto NÃO tinha:
--   invoices.custom_value, tasks.deliverables, albums.assets
-- e o app guardava esses valores no localStorage do navegador.
-- Idempotente: pode ser executada mais de uma vez.
-- =================================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS custom_value DECIMAL(12, 2) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

ALTER TABLE albums ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '[]'::jsonb;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS method TEXT DEFAULT NULL; -- forma de pagamento (PIX, transferência...)
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_task_id ON transactions(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_invoice_id ON tasks(invoice_id);

-- Faz o PostgREST (API do Supabase) enxergar as colunas novas imediatamente
NOTIFY pgrst, 'reload schema';
