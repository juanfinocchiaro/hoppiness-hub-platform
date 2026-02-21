-- =====================================================================
-- Migration: Atomic Cash Transfers + Materialized Balance
-- Adds: transfer_id, current_balance, transfer_between_registers()
-- =====================================================================

-- ─── 1. transfer_id on movements ─────────────────────────────────
ALTER TABLE public.cash_register_movements
  ADD COLUMN IF NOT EXISTS transfer_id UUID;

CREATE INDEX IF NOT EXISTS idx_crm_transfer_id
  ON cash_register_movements(transfer_id)
  WHERE transfer_id IS NOT NULL;

-- ─── 2. current_balance on shifts ────────────────────────────────
ALTER TABLE public.cash_register_shifts
  ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2);

-- ─── 3. Backfill current_balance for all open shifts ─────────────
WITH balances AS (
  SELECT
    s.id AS shift_id,
    s.opening_amount
      + COALESCE(SUM(CASE WHEN m.type IN ('income','deposit')  THEN m.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN m.type IN ('expense','withdrawal') THEN m.amount ELSE 0 END), 0)
    AS computed_balance
  FROM cash_register_shifts s
  LEFT JOIN cash_register_movements m ON m.shift_id = s.id
  WHERE s.status = 'open'
  GROUP BY s.id, s.opening_amount
)
UPDATE cash_register_shifts s
SET current_balance = b.computed_balance
FROM balances b
WHERE s.id = b.shift_id;

-- Set default for future rows
ALTER TABLE public.cash_register_shifts
  ALTER COLUMN current_balance SET DEFAULT 0;

-- ─── 4. Trigger: keep current_balance in sync on every movement ──
CREATE OR REPLACE FUNCTION public.update_shift_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE cash_register_shifts
    SET current_balance = COALESCE(current_balance, 0)
      + CASE WHEN NEW.type IN ('income','deposit') THEN NEW.amount ELSE -NEW.amount END
    WHERE id = NEW.shift_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_shift_balance ON cash_register_movements;
CREATE TRIGGER trg_update_shift_balance
  AFTER INSERT ON public.cash_register_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shift_balance();

-- ─── 5. Atomic transfer function ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.transfer_between_registers(
  p_source_shift_id UUID,
  p_dest_shift_id   UUID,       -- NULL for final withdrawal from Fuerte
  p_amount          DECIMAL,
  p_concept         TEXT,
  p_user_id         UUID,
  p_branch_id       UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer_id   UUID := gen_random_uuid();
  v_source_balance DECIMAL;
  v_source_register_id UUID;
  v_dest_register_id   UUID;
  v_withdrawal    jsonb;
  v_deposit       jsonb;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  -- Get source balance and register_id (lock the row)
  SELECT current_balance, cash_register_id
  INTO v_source_balance, v_source_register_id
  FROM cash_register_shifts
  WHERE id = p_source_shift_id
    AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno origen no encontrado o cerrado';
  END IF;

  IF COALESCE(v_source_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponible: $%, solicitado: $%',
      COALESCE(v_source_balance, 0), p_amount;
  END IF;

  -- Get dest register_id if provided
  IF p_dest_shift_id IS NOT NULL THEN
    SELECT cash_register_id INTO v_dest_register_id
    FROM cash_register_shifts
    WHERE id = p_dest_shift_id AND status = 'open'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Turno destino no encontrado o cerrado';
    END IF;
  END IF;

  -- 1) Withdrawal from source
  INSERT INTO cash_register_movements (
    shift_id, branch_id, type, payment_method, amount,
    concept, recorded_by, transfer_id, source_register_id
  ) VALUES (
    p_source_shift_id, p_branch_id, 'withdrawal', 'efectivo', p_amount,
    p_concept, p_user_id, v_transfer_id, NULL
  )
  RETURNING to_jsonb(cash_register_movements.*) INTO v_withdrawal;

  -- 2) Deposit to destination (if exists)
  IF p_dest_shift_id IS NOT NULL THEN
    INSERT INTO cash_register_movements (
      shift_id, branch_id, type, payment_method, amount,
      concept, recorded_by, transfer_id, source_register_id
    ) VALUES (
      p_dest_shift_id, p_branch_id, 'deposit', 'efectivo', p_amount,
      p_concept, p_user_id, v_transfer_id, v_source_register_id
    )
    RETURNING to_jsonb(cash_register_movements.*) INTO v_deposit;
  END IF;

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'withdrawal', v_withdrawal,
    'deposit', COALESCE(v_deposit, 'null'::jsonb)
  );
END;
$$;

-- ─── 6. Helper: get balance for a shift (read-only) ──────────────
CREATE OR REPLACE FUNCTION public.get_register_balance(p_shift_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(current_balance, 0)
  FROM cash_register_shifts
  WHERE id = p_shift_id;
$$;
