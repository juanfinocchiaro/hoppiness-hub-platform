
-- Trigger: recalculate canon_liquidaciones saldo when a pago is verified/unverified/deleted
CREATE OR REPLACE FUNCTION public.update_canon_saldo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _canon_id uuid;
  _total_verificado numeric;
  _total_canon numeric;
  _saldo numeric;
BEGIN
  -- Determine which canon_liquidacion to update
  IF TG_OP = 'DELETE' THEN
    _canon_id := OLD.canon_liquidacion_id;
  ELSE
    _canon_id := NEW.canon_liquidacion_id;
  END IF;

  -- Sum only verified, non-deleted payments
  SELECT COALESCE(SUM(monto), 0) INTO _total_verificado
  FROM pagos_canon
  WHERE canon_liquidacion_id = _canon_id
    AND verificado = true
    AND deleted_at IS NULL;

  -- Get total canon
  SELECT total_canon INTO _total_canon
  FROM canon_liquidaciones
  WHERE id = _canon_id;

  _saldo := GREATEST(_total_canon - _total_verificado, 0);

  UPDATE canon_liquidaciones
  SET saldo_pendiente = _saldo,
      estado = CASE
        WHEN _saldo <= 0 THEN 'pagado'
        WHEN _total_verificado > 0 THEN 'parcial'
        ELSE 'pendiente'
      END,
      updated_at = now()
  WHERE id = _canon_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fire on INSERT (new payment), UPDATE (verification), or soft-delete
CREATE TRIGGER trg_update_canon_saldo
AFTER INSERT OR UPDATE OF verificado, deleted_at, monto ON pagos_canon
FOR EACH ROW
EXECUTE FUNCTION public.update_canon_saldo();
