-- Adiciona a coluna custom_value para possibilitar editar o valor total da nota
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS custom_value DECIMAL(12, 2) DEFAULT NULL;
