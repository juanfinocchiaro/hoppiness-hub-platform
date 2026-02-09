
-- Fix security warnings: set search_path on functions

CREATE OR REPLACE FUNCTION actualizar_total_factura()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_subtotal NUMERIC(12,2);
  v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  
  SELECT COALESCE(SUM(subtotal), 0) INTO nuevo_subtotal
  FROM public.items_factura
  WHERE factura_id = v_factura_id;
  
  UPDATE public.facturas_proveedores
  SET 
    subtotal = nuevo_subtotal,
    total = nuevo_subtotal + COALESCE(iva, 0) + COALESCE(otros_impuestos, 0),
    updated_at = NOW()
  WHERE id = v_factura_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION actualizar_saldo_factura()
RETURNS TRIGGER AS $$
DECLARE
  total_pagado NUMERIC(12,2);
  total_factura NUMERIC(12,2);
  v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  
  SELECT COALESCE(SUM(monto), 0) INTO total_pagado
  FROM public.pagos_proveedores
  WHERE factura_id = v_factura_id AND deleted_at IS NULL;
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix security definer view: recreate as SECURITY INVOKER
DROP VIEW IF EXISTS cuenta_corriente_proveedores;
CREATE VIEW cuenta_corriente_proveedores WITH (security_invoker = true) AS
SELECT 
  p.id as proveedor_id,
  p.razon_social,
  f.branch_id,
  b.name as branch_nombre,
  COUNT(f.id) as cantidad_facturas,
  SUM(f.total) as total_facturado,
  SUM(f.saldo_pendiente) as saldo_pendiente,
  SUM(f.total) - SUM(f.saldo_pendiente) as total_pagado,
  COUNT(*) FILTER (WHERE f.estado_pago = 'vencido') as facturas_vencidas,
  COUNT(*) FILTER (WHERE f.estado_pago = 'pendiente') as facturas_pendientes,
  MIN(f.fecha_vencimiento) FILTER (WHERE f.estado_pago IN ('pendiente', 'vencido')) as proximo_vencimiento,
  MAX(f.factura_fecha) as ultima_compra
FROM proveedores p
JOIN facturas_proveedores f ON f.proveedor_id = p.id AND f.deleted_at IS NULL
JOIN branches b ON b.id = f.branch_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.razon_social, f.branch_id, b.name;
