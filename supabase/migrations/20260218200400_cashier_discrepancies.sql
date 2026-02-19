-- Fase 7: Discrepancias de cajero

-- Tabla de historial de discrepancias
CREATE TABLE IF NOT EXISTS public.cashier_discrepancy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES cash_register_shifts(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cash_register_id UUID REFERENCES cash_registers(id),
  expected_amount DECIMAL(10,2) NOT NULL,
  actual_amount DECIMAL(10,2) NOT NULL,
  discrepancy DECIMAL(10,2) NOT NULL,
  shift_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_user ON cashier_discrepancy_history(user_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_branch ON cashier_discrepancy_history(branch_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_date ON cashier_discrepancy_history(shift_date);
CREATE INDEX IF NOT EXISTS idx_discrepancy_shift ON cashier_discrepancy_history(shift_id);

ALTER TABLE cashier_discrepancy_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view discrepancies" ON cashier_discrepancy_history;
CREATE POLICY "Staff can view discrepancies" ON cashier_discrepancy_history
  FOR SELECT
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "System can insert discrepancies" ON cashier_discrepancy_history;
CREATE POLICY "System can insert discrepancies" ON cashier_discrepancy_history
  FOR INSERT
  WITH CHECK (true);

-- Función para calcular estadísticas de discrepancias
CREATE OR REPLACE FUNCTION public.get_cashier_discrepancy_stats(
  _user_id UUID,
  _branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_shifts INTEGER,
  perfect_shifts INTEGER,
  precision_pct NUMERIC,
  discrepancy_this_month NUMERIC,
  discrepancy_total NUMERIC,
  last_discrepancy_date DATE,
  last_discrepancy_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_shifts INTEGER := 0;
  v_perfect_shifts INTEGER := 0;
  v_discrepancy_month NUMERIC := 0;
  v_discrepancy_total NUMERIC := 0;
  v_last_date DATE;
  v_last_amount NUMERIC := 0;
BEGIN
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE discrepancy = 0)::INTEGER,
    COALESCE(SUM(discrepancy) FILTER (WHERE DATE_TRUNC('month', shift_date) = DATE_TRUNC('month', CURRENT_DATE)), 0),
    COALESCE(SUM(discrepancy), 0),
    MAX(shift_date)
  INTO
    v_total_shifts,
    v_perfect_shifts,
    v_discrepancy_month,
    v_discrepancy_total,
    v_last_date
  FROM cashier_discrepancy_history
  WHERE user_id = _user_id
    AND (_branch_id IS NULL OR branch_id = _branch_id);

  IF v_last_date IS NOT NULL THEN
    SELECT COALESCE(SUM(discrepancy), 0) INTO v_last_amount
    FROM cashier_discrepancy_history
    WHERE user_id = _user_id
      AND (_branch_id IS NULL OR branch_id = _branch_id)
      AND shift_date = v_last_date;
  END IF;

  RETURN QUERY SELECT
    v_total_shifts,
    v_perfect_shifts,
    CASE WHEN v_total_shifts > 0 THEN ROUND((v_perfect_shifts::NUMERIC / v_total_shifts::NUMERIC) * 100, 1) ELSE 100 END,
    v_discrepancy_month,
    v_discrepancy_total,
    v_last_date,
    v_last_amount;
END;
$$;

-- Trigger para registrar discrepancias automáticamente al cerrar caja
CREATE OR REPLACE FUNCTION public.record_cashier_discrepancy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo registrar si la caja se cerró y hay diferencia
  IF NEW.status = 'closed' AND NEW.closed_by IS NOT NULL AND NEW.difference IS NOT NULL THEN
    INSERT INTO cashier_discrepancy_history (
      shift_id,
      branch_id,
      user_id,
      cash_register_id,
      expected_amount,
      actual_amount,
      discrepancy,
      shift_date,
      notes
    )
    VALUES (
      NEW.id,
      NEW.branch_id,
      NEW.closed_by,
      NEW.cash_register_id,
      COALESCE(NEW.expected_amount, 0),
      COALESCE(NEW.closing_amount, 0),
      COALESCE(NEW.difference, 0),
      DATE(NEW.closed_at),
      NEW.notes
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_cashier_discrepancy ON cash_register_shifts;
CREATE TRIGGER trg_record_cashier_discrepancy
  AFTER UPDATE OF status, closed_at, difference ON cash_register_shifts
  FOR EACH ROW
  WHEN (NEW.status = 'closed' AND OLD.status = 'open')
  EXECUTE FUNCTION public.record_cashier_discrepancy();

COMMENT ON TABLE cashier_discrepancy_history IS 'Historial de discrepancias de cajero al cerrar turnos';
COMMENT ON FUNCTION get_cashier_discrepancy_stats IS 'Calcula estadísticas de discrepancias para un cajero';
