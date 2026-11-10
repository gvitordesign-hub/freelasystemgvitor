-- =================================================================
-- Migration: Regra de pagamento no banco + índices anti-duplicata
-- Data: 2026-11-10
--
-- Pré-requisitos:
--   1) 20261110120000_sync_missing_columns.sql aplicada
--   2) Sem duplicatas (ver supabase/scripts/diagnose_duplicate_transactions.sql)
--
-- A nota (invoice) é a fonte da verdade do recebimento:
--   pay_invoice()    -> quita nota, conclui tarefas e lança no caixa (atômico)
--   reopen_invoice() -> volta nota e lançamentos para Pendente
-- Ambas rodam como o usuário logado (SECURITY INVOKER), então o RLS continua valendo.
-- =================================================================

-- 1. Índices únicos parciais: impossível duplicar entrada por tarefa / por nota
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_entrada_por_tarefa
  ON transactions (task_id)
  WHERE type = 'Entrada' AND task_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_entrada_avulsa_por_nota
  ON transactions (invoice_id)
  WHERE type = 'Entrada' AND task_id IS NULL AND invoice_id IS NOT NULL;

-- 2. pay_invoice
CREATE OR REPLACE FUNCTION pay_invoice(
  p_invoice_id UUID,
  p_paid_at DATE DEFAULT CURRENT_DATE,
  p_method TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv invoices%ROWTYPE;
  v_calc NUMERIC := 0;
  v_count INTEGER := 0;
  v_total NUMERIC;
  v_task RECORD;
  v_val NUMERIC;
  v_alloc NUMERIC := 0;
  v_i INTEGER := 0;
  v_client_label TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_inv FROM invoices
   WHERE id = p_invoice_id AND user_id = v_uid
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota não encontrada';
  END IF;

  SELECT COALESCE(SUM(value), 0), COUNT(*) INTO v_calc, v_count
    FROM tasks WHERE invoice_id = p_invoice_id AND user_id = v_uid;

  v_total := COALESCE(v_inv.custom_value, v_calc);

  -- Meio-dia no fuso do Brasil evita o dia "voltar" ao converter para UTC
  UPDATE invoices
     SET status = 'Pago',
         paid_at = (p_paid_at::TEXT || ' 12:00:00-03')::TIMESTAMPTZ
   WHERE id = p_invoice_id;

  UPDATE tasks SET status = 'Concluído'
   WHERE invoice_id = p_invoice_id AND user_id = v_uid AND status <> 'Concluído';

  IF v_count > 0 AND v_calc > 0 THEN
    -- Um lançamento por tarefa; rateio proporcional ao valor editado da nota.
    -- A última tarefa absorve os centavos, para a soma bater exatamente.
    FOR v_task IN
      SELECT id, title, category, value FROM tasks
       WHERE invoice_id = p_invoice_id AND user_id = v_uid
       ORDER BY created_at, id
    LOOP
      v_i := v_i + 1;
      IF v_i = v_count THEN
        v_val := v_total - v_alloc;
      ELSE
        v_val := ROUND(COALESCE(v_task.value, 0) * v_total / v_calc, 2);
      END IF;
      v_alloc := v_alloc + v_val;

      IF v_val > 0 THEN
        INSERT INTO transactions
          (user_id, description, value, type, date, status, category, task_id, invoice_id, method)
        VALUES
          (v_uid, 'Serviço: ' || v_task.title, v_val, 'Entrada', p_paid_at, 'Pago',
           COALESCE(v_task.category, 'Serviço'), v_task.id, p_invoice_id, p_method)
        ON CONFLICT (task_id) WHERE type = 'Entrada' AND task_id IS NOT NULL
        DO UPDATE SET value = EXCLUDED.value,
                      status = 'Pago',
                      date = EXCLUDED.date,
                      invoice_id = EXCLUDED.invoice_id,
                      method = COALESCE(EXCLUDED.method, transactions.method);
      END IF;
    END LOOP;

  ELSIF v_total > 0 THEN
    -- Nota sem tarefas: um único lançamento da nota
    SELECT COALESCE(NULLIF(company, ''), name) INTO v_client_label
      FROM clients WHERE id = v_inv.client_id;

    INSERT INTO transactions
      (user_id, description, value, type, date, status, category, invoice_id, method)
    VALUES
      (v_uid,
       'Nota: ' || v_inv.title || COALESCE(' (' || v_client_label || ')', ''),
       v_total, 'Entrada', p_paid_at, 'Pago', 'Serviço', p_invoice_id, p_method)
    ON CONFLICT (invoice_id) WHERE type = 'Entrada' AND task_id IS NULL AND invoice_id IS NOT NULL
    DO UPDATE SET value = EXCLUDED.value,
                  status = 'Pago',
                  date = EXCLUDED.date,
                  method = COALESCE(EXCLUDED.method, transactions.method);
  END IF;
END;
$$;

-- 3. reopen_invoice
CREATE OR REPLACE FUNCTION reopen_invoice(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE invoices SET status = 'Pendente', paid_at = NULL
   WHERE id = p_invoice_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota não encontrada';
  END IF;

  UPDATE transactions SET status = 'Pendente'
   WHERE user_id = v_uid AND type = 'Entrada'
     AND (invoice_id = p_invoice_id
          OR task_id IN (SELECT id FROM tasks WHERE invoice_id = p_invoice_id AND user_id = v_uid));
END;
$$;

GRANT EXECUTE ON FUNCTION pay_invoice(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_invoice(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
