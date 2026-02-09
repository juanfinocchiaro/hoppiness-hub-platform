
-- Trigger: auto-create/update canon_liquidaciones when ventas_mensuales_local is inserted/updated
CREATE OR REPLACE FUNCTION public.sync_canon_liquidacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vt numeric;
  _ef numeric;
  _online numeric;
  _canon_monto numeric;
  _mkt_monto numeric;
  _total numeric;
  _pago_ef numeric;
  _pago_transf numeric;
  _existing_id uuid;
BEGIN
  -- Skip if soft-deleted
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _vt := COALESCE(NEW.venta_total, 0);
  _ef := COALESCE(NEW.efectivo, 0);
  _online := _vt - _ef;

  -- Canon = 4.5% of total, Marketing = 0.5% of total
  _canon_monto := ROUND(_vt * 0.045, 2);
  _mkt_monto := ROUND(_vt * 0.005, 2);
  _total := _canon_monto + _mkt_monto;

  -- Payment instructions: 5% of cash in cash, 5% of online by transfer
  _pago_ef := ROUND(_ef * 0.05, 2);
  _pago_transf := ROUND(_online * 0.05, 2);

  -- Check if liquidacion already exists for this venta
  SELECT id INTO _existing_id
  FROM canon_liquidaciones
  WHERE ventas_id = NEW.id
    AND deleted_at IS NULL;

  IF _existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE canon_liquidaciones SET
      fc_total = _online,
      ft_total = _ef,
      canon_porcentaje = 4.5,
      canon_monto = _canon_monto,
      marketing_porcentaje = 0.5,
      marketing_monto = _mkt_monto,
      total_canon = _total,
      pago_ft_sugerido = _pago_ef,
      pago_vt_sugerido = _pago_transf,
      porcentaje_ft = CASE WHEN _vt > 0 THEN ROUND((_ef / _vt) * 100, 1) ELSE 0 END,
      saldo_pendiente = _total - COALESCE((
        SELECT SUM(monto) FROM pagos_canon 
        WHERE canon_liquidacion_id = _existing_id 
          AND verificado = true 
          AND deleted_at IS NULL
      ), 0),
      updated_at = now()
    WHERE id = _existing_id;
  ELSE
    -- Create new liquidacion
    INSERT INTO canon_liquidaciones (
      branch_id, periodo, ventas_id,
      fc_total, ft_total,
      canon_porcentaje, canon_monto,
      marketing_porcentaje, marketing_monto,
      total_canon, saldo_pendiente,
      pago_ft_sugerido, pago_vt_sugerido,
      porcentaje_ft,
      estado, created_by
    ) VALUES (
      NEW.branch_id, NEW.periodo, NEW.id,
      _online, _ef,
      4.5, _canon_monto,
      0.5, _mkt_monto,
      _total, _total,
      _pago_ef, _pago_transf,
      CASE WHEN _vt > 0 THEN ROUND((_ef / _vt) * 100, 1) ELSE 0 END,
      'pendiente', NEW.cargado_por
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_canon_liquidacion
AFTER INSERT OR UPDATE OF venta_total, efectivo, deleted_at ON ventas_mensuales_local
FOR EACH ROW
EXECUTE FUNCTION public.sync_canon_liquidacion();

-- Backfill: generate liquidaciones for existing ventas that don't have one
INSERT INTO canon_liquidaciones (
  branch_id, periodo, ventas_id,
  fc_total, ft_total,
  canon_porcentaje, canon_monto,
  marketing_porcentaje, marketing_monto,
  total_canon, saldo_pendiente,
  pago_ft_sugerido, pago_vt_sugerido,
  porcentaje_ft,
  estado, created_by
)
SELECT
  v.branch_id, v.periodo, v.id,
  COALESCE(v.venta_total, 0) - COALESCE(v.efectivo, 0), -- fc_total (online)
  COALESCE(v.efectivo, 0), -- ft_total (efectivo)
  4.5, ROUND(COALESCE(v.venta_total, 0) * 0.045, 2),
  0.5, ROUND(COALESCE(v.venta_total, 0) * 0.005, 2),
  ROUND(COALESCE(v.venta_total, 0) * 0.05, 2), -- total_canon
  ROUND(COALESCE(v.venta_total, 0) * 0.05, 2), -- saldo_pendiente (no verified payments yet)
  ROUND(COALESCE(v.efectivo, 0) * 0.05, 2), -- pago_ft_sugerido
  ROUND((COALESCE(v.venta_total, 0) - COALESCE(v.efectivo, 0)) * 0.05, 2), -- pago_vt_sugerido
  CASE WHEN COALESCE(v.venta_total, 0) > 0 THEN ROUND((COALESCE(v.efectivo, 0) / v.venta_total) * 100, 1) ELSE 0 END,
  'pendiente',
  v.cargado_por
FROM ventas_mensuales_local v
WHERE v.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM canon_liquidaciones cl 
    WHERE cl.ventas_id = v.id AND cl.deleted_at IS NULL
  );
