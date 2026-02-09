
-- 1. Add verification columns to pagos_proveedores
ALTER TABLE public.pagos_proveedores 
  ADD COLUMN verificado boolean NOT NULL DEFAULT true,
  ADD COLUMN verificado_por uuid,
  ADD COLUMN verificado_at timestamptz,
  ADD COLUMN verificado_notas text;

-- 2. Set existing Hoppiness Club payments to unverified (pending brand approval)
UPDATE public.pagos_proveedores pp
SET verificado = false
WHERE EXISTS (
  SELECT 1 FROM facturas_proveedores fp
  WHERE fp.id = pp.factura_id
    AND fp.proveedor_id = '00000000-0000-0000-0000-000000000001'
)
AND pp.deleted_at IS NULL;

-- 3. Auto-set verificado=false for NEW Hoppiness Club payments
CREATE OR REPLACE FUNCTION public.set_canon_payment_unverified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM facturas_proveedores 
    WHERE id = NEW.factura_id 
    AND proveedor_id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    NEW.verificado := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_canon_payment_unverified
BEFORE INSERT ON public.pagos_proveedores
FOR EACH ROW
EXECUTE FUNCTION public.set_canon_payment_unverified();

-- 4. Update saldo calculation to only count VERIFIED payments
CREATE OR REPLACE FUNCTION public.actualizar_saldo_factura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_pagado NUMERIC(12,2);
  total_factura NUMERIC(12,2);
  v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  
  SELECT COALESCE(SUM(monto), 0) INTO total_pagado
  FROM public.pagos_proveedores
  WHERE factura_id = v_factura_id 
    AND deleted_at IS NULL
    AND verificado = true;
  
  SELECT total INTO total_factura
  FROM public.facturas_proveedores
  WHERE id = v_factura_id;
  
  UPDATE public.facturas_proveedores
  SET 
    saldo_pendiente = total_factura - total_pagado,
    estado_pago = CASE 
      WHEN total_factura - total_pagado <= 0 THEN 'pagado'
      ELSE 'pendiente'
    END,
    updated_at = NOW()
  WHERE id = v_factura_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Recalculate saldos for all Hoppiness Club facturas
DO $$
DECLARE
  r RECORD;
  v_total_pagado NUMERIC(12,2);
BEGIN
  FOR r IN 
    SELECT fp.id, fp.total
    FROM facturas_proveedores fp
    WHERE fp.proveedor_id = '00000000-0000-0000-0000-000000000001'
      AND fp.deleted_at IS NULL
  LOOP
    SELECT COALESCE(SUM(monto), 0) INTO v_total_pagado
    FROM pagos_proveedores 
    WHERE factura_id = r.id AND deleted_at IS NULL AND verificado = true;
    
    UPDATE facturas_proveedores
    SET saldo_pendiente = r.total - v_total_pagado,
        estado_pago = CASE 
          WHEN r.total - v_total_pagado <= 0 THEN 'pagado'
          ELSE 'pendiente'
        END
    WHERE id = r.id;
  END LOOP;
END $$;

-- 6. Prevent soft-delete of verified payments
CREATE OR REPLACE FUNCTION public.prevent_delete_verified_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.verificado = true AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'No se puede eliminar un pago verificado por la marca';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_delete_verified
BEFORE UPDATE ON public.pagos_proveedores
FOR EACH ROW
EXECUTE FUNCTION public.prevent_delete_verified_payment();
