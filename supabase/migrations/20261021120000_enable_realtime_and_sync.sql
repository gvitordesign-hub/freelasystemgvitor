-- =================================================================
-- Migration: Sincronização em Tempo Real (Realtime) & Vínculo Nota/Transações
-- Data: 2026-10-21
--
-- 1. Garante a coluna invoice_id na tabela transactions para relacionamento
--    direto e consistente com notas fiscais/projetos.
-- 2. Habilita todas as tabelas na publicação 'supabase_realtime' para que o
--    canal postgres_changes receba eventos instantâneos.
-- 3. Define REPLICA IDENTITY FULL para que alterações e exclusões
--    contenham o registro completo anterior e novo.
-- =================================================================

-- 1. Adicionar invoice_id na tabela transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);

-- 2. Habilitar REPLICA IDENTITY FULL nas tabelas críticas
ALTER TABLE invoices REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE user_settings REPLICA IDENTITY FULL;
ALTER TABLE services REPLICA IDENTITY FULL;
ALTER TABLE budgets REPLICA IDENTITY FULL;
ALTER TABLE reminders REPLICA IDENTITY FULL;

-- 3. Adicionar tabelas à publicação do Supabase Realtime (se ainda não estiverem)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE clients;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE services;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE reminders;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
