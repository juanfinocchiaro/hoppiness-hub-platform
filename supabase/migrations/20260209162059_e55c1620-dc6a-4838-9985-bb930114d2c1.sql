
-- Fix security definer view - recreate as SECURITY INVOKER
CREATE OR REPLACE VIEW public.cuenta_corriente_marca 
WITH (security_invoker = true) AS
SELECT 
  f.id,
  f.branch_id,
  b.name AS local_nombre,
  f.periodo,
  f.factura_numero,
  f.factura_fecha,
  f.total AS monto_canon,
  f.saldo_pendiente,
  f.estado_pago,
  f.fecha_vencimiento,
  f.observaciones AS detalle
FROM public.facturas_proveedores f
JOIN public.branches b ON b.id = f.branch_id
WHERE f.proveedor_id = '00000000-0000-0000-0000-000000000001'
  AND f.deleted_at IS NULL
ORDER BY f.periodo DESC, b.name;
