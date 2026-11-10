-- =================================================================
-- DIAGNÓSTICO (somente leitura): lançamentos de entrada duplicados
-- Rode ANTES da migration 20261110121000_payment_rpc_and_unique_indexes.sql
-- (os índices únicos falham se houver duplicatas).
-- =================================================================

-- 1) Mais de uma "Entrada" para a mesma tarefa
SELECT task_id, count(*) AS qtd,
       array_agg(id ORDER BY created_at) AS ids,
       array_agg(value ORDER BY created_at) AS valores,
       array_agg(status ORDER BY created_at) AS status,
       array_agg(date ORDER BY created_at) AS datas
FROM transactions
WHERE type = 'Entrada' AND task_id IS NOT NULL
GROUP BY task_id
HAVING count(*) > 1;

-- 2) Mais de uma "Entrada" avulsa (sem tarefa) para a mesma nota
SELECT invoice_id, count(*) AS qtd,
       array_agg(id ORDER BY created_at) AS ids,
       array_agg(value ORDER BY created_at) AS valores,
       array_agg(status ORDER BY created_at) AS status
FROM transactions
WHERE type = 'Entrada' AND task_id IS NULL AND invoice_id IS NOT NULL
GROUP BY invoice_id
HAVING count(*) > 1;

-- 3) Lançamentos "Projeto: ..." criados na aprovação de orçamento (possível dupla contagem)
SELECT id, description, value, status, date, invoice_id
FROM transactions
WHERE type = 'Entrada' AND task_id IS NULL AND invoice_id IS NULL
  AND description LIKE 'Projeto:%'
ORDER BY date DESC;
