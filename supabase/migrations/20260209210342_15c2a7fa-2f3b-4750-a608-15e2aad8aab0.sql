
-- =============================================
-- PASO 1: Corregir trigger de saldo de facturas
-- =============================================

-- Drop triggers existentes en pagos_proveedores
DROP TRIGGER IF EXISTS update_saldo_factura_after_pago ON public.pagos_proveedores;
DROP TRIGGER IF EXISTS update_saldo_factura_after_delete_pago ON public.pagos_proveedores;

-- Recrear con INSERT + UPDATE OF verificado, deleted_at, monto
CREATE TRIGGER update_saldo_factura_after_pago
AFTER INSERT OR UPDATE OF verificado, deleted_at, monto
ON public.pagos_proveedores
FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_factura();

-- =============================================
-- PASO 2: Sincronizar canon_liquidaciones desde facturas_proveedores
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_factura_to_canon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo para facturas de Hoppiness Club
  IF NEW.proveedor_id != '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;

  UPDATE canon_liquidaciones
  SET saldo_pendiente = NEW.saldo_pendiente,
      estado = CASE
        WHEN NEW.saldo_pendiente <= 0 THEN 'pagado'
        WHEN NEW.saldo_pendiente < NEW.total THEN 'parcial'
        ELSE 'pendiente'
      END,
      updated_at = now()
  WHERE branch_id = NEW.branch_id
    AND periodo = NEW.periodo
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_factura_to_canon
AFTER UPDATE OF saldo_pendiente, estado_pago
ON public.facturas_proveedores
FOR EACH ROW EXECUTE FUNCTION sync_factura_to_canon();

-- =============================================
-- PASO 3: Recalcular saldos existentes (backfill)
-- =============================================

-- 3a: Recalcular saldo_pendiente en facturas de Hoppiness Club
UPDATE public.facturas_proveedores f
SET saldo_pendiente = f.total - COALESCE((
  SELECT SUM(p.monto) FROM public.pagos_proveedores p
  WHERE p.factura_id = f.id AND p.deleted_at IS NULL AND p.verificado = true
), 0),
estado_pago = CASE
  WHEN f.total - COALESCE((
    SELECT SUM(p.monto) FROM public.pagos_proveedores p
    WHERE p.factura_id = f.id AND p.deleted_at IS NULL AND p.verificado = true
  ), 0) <= 0 THEN 'pagado'
  ELSE 'pendiente'
END,
updated_at = now()
WHERE f.proveedor_id = '00000000-0000-0000-0000-000000000001'
  AND f.deleted_at IS NULL;

-- 3b: Sincronizar canon_liquidaciones desde facturas recalculadas
UPDATE public.canon_liquidaciones cl
SET saldo_pendiente = COALESCE(f.saldo_pendiente, cl.total_canon),
    estado = CASE
      WHEN COALESCE(f.saldo_pendiente, cl.total_canon) <= 0 THEN 'pagado'
      WHEN COALESCE(f.saldo_pendiente, cl.total_canon) < cl.total_canon THEN 'parcial'
      ELSE 'pendiente'
    END,
    updated_at = now()
FROM public.facturas_proveedores f
WHERE f.proveedor_id = '00000000-0000-0000-0000-000000000001'
  AND f.branch_id = cl.branch_id
  AND f.periodo = cl.periodo
  AND f.deleted_at IS NULL
  AND cl.deleted_at IS NULL;

-- =============================================
-- PASO 4: Eliminar trigger obsoleto en pagos_canon
-- =============================================

DROP TRIGGER IF EXISTS trg_update_canon_saldo ON public.pagos_canon;
