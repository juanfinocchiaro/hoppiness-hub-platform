
-- Fix: cambiar vista a SECURITY INVOKER (default, más seguro)
DROP VIEW IF EXISTS public.rdo_report_data;

CREATE VIEW public.rdo_report_data
WITH (security_invoker = true)
AS

-- Items de facturas (compras de insumos y servicios)
SELECT
  f.branch_id,
  f.periodo,
  COALESCE(i.rdo_category_code, cs.categoria_gasto, i.categoria_pl) as rdo_category_code,
  SUM(it.subtotal) as total
FROM public.items_factura it
JOIN public.facturas_proveedores f ON f.id = it.factura_id
LEFT JOIN public.insumos i ON i.id = it.insumo_id
LEFT JOIN public.conceptos_servicio cs ON cs.id = it.concepto_servicio_id
WHERE f.deleted_at IS NULL
GROUP BY f.branch_id, f.periodo, COALESCE(i.rdo_category_code, cs.categoria_gasto, i.categoria_pl)

UNION ALL

-- Gastos directos
SELECT
  g.branch_id,
  g.periodo,
  g.rdo_category_code,
  SUM(g.monto) as total
FROM public.gastos g
WHERE g.deleted_at IS NULL
  AND g.rdo_category_code IS NOT NULL
GROUP BY g.branch_id, g.periodo, g.rdo_category_code

UNION ALL

-- Consumos manuales
SELECT
  cm.branch_id,
  cm.periodo,
  CASE cm.categoria_pl
    WHEN 'materia_prima' THEN 'cmv_hamburguesas'
    WHEN 'descartables' THEN 'descartables_salon'
    WHEN 'limpieza' THEN 'limpieza_higiene'
    WHEN 'mantenimiento' THEN 'mantenimiento'
    WHEN 'marketing' THEN 'marketing'
    ELSE NULL
  END as rdo_category_code,
  SUM(cm.monto_consumido) as total
FROM public.consumos_manuales cm
WHERE cm.deleted_at IS NULL
GROUP BY cm.branch_id, cm.periodo, cm.categoria_pl;
