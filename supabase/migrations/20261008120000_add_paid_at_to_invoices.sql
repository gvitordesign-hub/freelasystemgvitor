-- Adiciona a coluna paid_at para registrar a data e hora em que a nota foi quitada
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL;
