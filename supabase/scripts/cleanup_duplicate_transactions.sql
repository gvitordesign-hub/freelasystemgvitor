-- =================================================================
-- LIMPEZA de lançamentos de entrada duplicados.
-- Rode somente DEPOIS de conferir o resultado de diagnose_duplicate_transactions.sql
-- e de ter feito backup.
--
-- Regra: entre duplicatas, mantém uma só, priorizando 'Pago' e, em
-- seguida, a mais antiga. As demais são removidas.
-- =================================================================

BEGIN;

-- Duplicatas por tarefa
DELETE FROM transactions t
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY task_id
           ORDER BY (status = 'Pago') DESC, created_at ASC, id ASC
         ) AS rn
  FROM transactions
  WHERE type = 'Entrada' AND task_id IS NOT NULL
) d
WHERE t.id = d.id AND d.rn > 1;

-- Duplicatas avulsas por nota
DELETE FROM transactions t
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY invoice_id
           ORDER BY (status = 'Pago') DESC, created_at ASC, id ASC
         ) AS rn
  FROM transactions
  WHERE type = 'Entrada' AND task_id IS NULL AND invoice_id IS NOT NULL
) d
WHERE t.id = d.id AND d.rn > 1;

COMMIT;
