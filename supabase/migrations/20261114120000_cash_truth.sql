-- =================================================================
-- Migration: caixa como fonte da verdade
-- Data: 2026-11-14
--
-- 1. transactions.client_id: cliente de um lançamento manual (sem
--    demanda/nota). Substitui a busca pelo nome na descrição.
-- 2. pay_invoice: considera TUDO que já entrou na nota (abatimentos e
--    demandas recebidas individualmente), lança só o restante e NUNCA
--    reescreve lançamentos já pagos (histórico do caixa fica intacto).
-- Idempotente.
-- =================================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions (client_id);

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
  v_total NUMERIC;
  v_received NUMERIC := 0;
  v_rest NUMERIC;
  v_open_base NUMERIC := 0;
  v_open_count INTEGER := 0;
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

  SELECT COALESCE(SUM(value), 0) INTO v_calc
    FROM tasks WHERE invoice_id = p_invoice_id AND user_id = v_uid;
  v_total := COALESCE(v_inv.custom_value, v_calc);

  -- Tudo que já entrou nesta nota (pela nota ou por demanda dela)
  SELECT COALESCE(SUM(value), 0) INTO v_received
    FROM transactions
   WHERE user_id = v_uid AND type = 'Entrada' AND status = 'Pago'
     AND (invoice_id = p_invoice_id
          OR task_id IN (SELECT id FROM tasks WHERE invoice_id = p_invoice_id AND user_id = v_uid));

  v_rest := GREATEST(v_total - v_received, 0);

  IF v_inv.status IS DISTINCT FROM 'Pago' OR v_inv.paid_at IS NULL THEN
    UPDATE invoices
       SET status = 'Pago',
           paid_at = (p_paid_at::TEXT || ' 12:00:00-03')::TIMESTAMPTZ
     WHERE id = p_invoice_id;
  END IF;

  UPDATE tasks SET status = 'Concluído'
   WHERE invoice_id = p_invoice_id AND user_id = v_uid AND status <> 'Concluído';

  IF v_rest <= 0 THEN
    RETURN;
  END IF;

  -- Demandas que ainda não têm entrada paga recebem o restante, proporcional ao valor
  SELECT COALESCE(SUM(t.value), 0), COUNT(*) INTO v_open_base, v_open_count
    FROM tasks t
   WHERE t.invoice_id = p_invoice_id AND t.user_id = v_uid AND COALESCE(t.value, 0) > 0
     AND NOT EXISTS (SELECT 1 FROM transactions x
                      WHERE x.task_id = t.id AND x.type = 'Entrada' AND x.status = 'Pago');

  IF v_open_count > 0 AND v_open_base > 0 THEN
    FOR v_task IN
      SELECT t.id, t.title, t.category, t.value FROM tasks t
       WHERE t.invoice_id = p_invoice_id AND t.user_id = v_uid AND COALESCE(t.value, 0) > 0
         AND NOT EXISTS (SELECT 1 FROM transactions x
                          WHERE x.task_id = t.id AND x.type = 'Entrada' AND x.status = 'Pago')
       ORDER BY t.created_at, t.id
    LOOP
      v_i := v_i + 1;
      IF v_i = v_open_count THEN
        v_val := v_rest - v_alloc;           -- a última absorve os centavos
      ELSE
        v_val := ROUND(v_task.value * v_rest / v_open_base, 2);
      END IF;
      v_alloc := v_alloc + v_val;

      IF v_val > 0 THEN
        INSERT INTO transactions
          (user_id, description, value, type, date, status, category, task_id, invoice_id, method)
        VALUES
          (v_uid, 'Serviço: ' || v_task.title, v_val, 'Entrada', p_paid_at, 'Pago',
           COALESCE(v_task.category, 'Serviço'), v_task.id, p_invoice_id, p_method)
        ON CONFLICT (task_id) WHERE type = 'Entrada' AND task_id IS NOT NULL
        DO UPDATE SET value = EXCLUDED.value,       -- só atinge entradas PENDENTES (as pagas foram excluídas acima)
                      date = EXCLUDED.date,
                      status = 'Pago',
                      invoice_id = EXCLUDED.invoice_id,
                      method = COALESCE(EXCLUDED.method, transactions.method);
      END IF;
    END LOOP;

  ELSE
    -- Nota sem demandas em aberto (ou sem demandas): uma entrada avulsa com o restante
    SELECT COALESCE(NULLIF(company, ''), name) INTO v_client_label
      FROM clients WHERE id = v_inv.client_id;

    INSERT INTO transactions
      (user_id, description, value, type, date, status, category, invoice_id, method)
    VALUES
      (v_uid,
       'Nota: ' || v_inv.title || COALESCE(' (' || v_client_label || ')', ''),
       v_rest, 'Entrada', p_paid_at, 'Pago', 'Serviço', p_invoice_id, p_method)
    ON CONFLICT (invoice_id) WHERE type = 'Entrada' AND task_id IS NULL AND invoice_id IS NOT NULL AND NOT abatement
    DO UPDATE SET value = CASE WHEN transactions.status = 'Pago'
                               THEN transactions.value + EXCLUDED.value   -- complemento (valor da nota aumentou)
                               ELSE EXCLUDED.value END,
                  date = CASE WHEN transactions.status = 'Pago' THEN transactions.date ELSE EXCLUDED.date END,
                  status = 'Pago',
                  method = COALESCE(EXCLUDED.method, transactions.method);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION pay_invoice(UUID, DATE, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
