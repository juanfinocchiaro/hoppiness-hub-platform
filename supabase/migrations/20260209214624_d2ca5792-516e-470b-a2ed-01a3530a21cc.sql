
DROP VIEW IF EXISTS public.cuenta_corriente_proveedores CASCADE;

CREATE VIEW public.cuenta_corriente_proveedores AS
SELECT 
  p.id AS proveedor_id,
  p.razon_social,
  p.cuit,
  COALESCE(f_agg.branch_id, pa.branch_id) AS branch_id,
  COALESCE(f_agg.total_facturado, 0::numeric) AS total_facturado,
  COALESCE(f_agg.pagado_en_facturas, 0::numeric) + COALESCE(pa.pagos_a_cuenta, 0) AS total_pagado,
  COALESCE(f_agg.total_facturado, 0::numeric) - (COALESCE(f_agg.pagado_en_facturas, 0::numeric) + COALESCE(pa.pagos_a_cuenta, 0)) AS total_pendiente,
  COALESCE(f_agg.cantidad_facturas, 0) AS cantidad_facturas,
  COALESCE(f_agg.facturas_pendientes, 0) AS facturas_pendientes,
  COALESCE(f_agg.facturas_vencidas, 0) AS facturas_vencidas,
  COALESCE(f_agg.monto_vencido, 0::numeric) AS monto_vencido,
  f_agg.proximo_vencimiento
FROM proveedores p
LEFT JOIN LATERAL (
  SELECT 
    ff.branch_id,
    SUM(ff.total) AS total_facturado,
    SUM(ff.total) - SUM(ff.saldo_pendiente) AS pagado_en_facturas,
    COUNT(ff.id) AS cantidad_facturas,
    COUNT(ff.id) FILTER (WHERE ff.estado_pago = 'pendiente') AS facturas_pendientes,
    COUNT(ff.id) FILTER (WHERE ff.estado_pago = 'pendiente' AND ff.fecha_vencimiento < CURRENT_DATE) AS facturas_vencidas,
    COALESCE(SUM(ff.saldo_pendiente) FILTER (WHERE ff.estado_pago = 'pendiente' AND ff.fecha_vencimiento < CURRENT_DATE), 0) AS monto_vencido,
    MIN(ff.fecha_vencimiento) FILTER (WHERE ff.estado_pago = 'pendiente' AND ff.fecha_vencimiento >= CURRENT_DATE) AS proximo_vencimiento
  FROM facturas_proveedores ff
  WHERE ff.proveedor_id = p.id AND ff.deleted_at IS NULL
  GROUP BY ff.branch_id
) f_agg ON true
LEFT JOIN (
  SELECT proveedor_id, branch_id, COALESCE(SUM(monto), 0) AS pagos_a_cuenta
  FROM pagos_proveedores
  WHERE factura_id IS NULL AND deleted_at IS NULL
  GROUP BY proveedor_id, branch_id
) pa ON pa.proveedor_id = p.id AND pa.branch_id = COALESCE(f_agg.branch_id, pa.branch_id)
WHERE p.deleted_at IS NULL;
