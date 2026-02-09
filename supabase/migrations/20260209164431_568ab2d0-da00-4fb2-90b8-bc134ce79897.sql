
-- Drop dependent view first, then recreate
DROP VIEW IF EXISTS public.cuenta_corriente_proveedores CASCADE;

CREATE VIEW public.cuenta_corriente_proveedores
WITH (security_invoker=on) AS
SELECT 
  p.id as proveedor_id,
  p.razon_social,
  p.cuit,
  f.branch_id,
  COALESCE(SUM(f.total), 0) as total_facturado,
  COALESCE(SUM(f.saldo_pendiente), 0) as total_pendiente,
  COALESCE(SUM(f.total) - SUM(f.saldo_pendiente), 0) as total_pagado,
  COUNT(f.id) as cantidad_facturas,
  COUNT(f.id) FILTER (WHERE f.estado_pago = 'pendiente') as facturas_pendientes,
  COUNT(f.id) FILTER (WHERE f.estado_pago = 'pendiente' AND f.fecha_vencimiento < CURRENT_DATE) as facturas_vencidas,
  COALESCE(SUM(f.saldo_pendiente) FILTER (WHERE f.estado_pago = 'pendiente' AND f.fecha_vencimiento < CURRENT_DATE), 0) as monto_vencido,
  MIN(f.fecha_vencimiento) FILTER (WHERE f.estado_pago = 'pendiente' AND f.fecha_vencimiento >= CURRENT_DATE) as proximo_vencimiento
FROM proveedores p
LEFT JOIN facturas_proveedores f ON f.proveedor_id = p.id AND f.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.razon_social, p.cuit, f.branch_id;

-- Gastos: add missing columns
ALTER TABLE public.gastos 
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS fecha_pago DATE,
  ADD COLUMN IF NOT EXISTS gasto_relacionado_id UUID REFERENCES public.gastos(id);
