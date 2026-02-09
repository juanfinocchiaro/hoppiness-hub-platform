
-- =============================================
-- FASE 3: Vista rdo_report_data + Función get_rdo_report
-- =============================================

-- Vista que consolida todos los costos por categoría RDO y período
CREATE OR REPLACE VIEW public.rdo_report_data AS

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

-- Gastos directos (gastos menores + gastos con rdo_category_code)
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

-- Consumos manuales (materia prima, descartables, etc.)
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

-- Función que genera el reporte RDO completo con porcentajes
CREATE OR REPLACE FUNCTION public.get_rdo_report(_branch_id uuid, _periodo text)
RETURNS TABLE (
  category_code text,
  category_name text,
  parent_code text,
  level integer,
  rdo_section text,
  behavior text,
  sort_order integer,
  total numeric,
  percentage numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ventas numeric;
BEGIN
  -- Obtener ventas del período
  SELECT COALESCE(fc_total, 0) + COALESCE(ft_total, 0)
  INTO v_ventas
  FROM ventas_mensuales_local
  WHERE branch_id = _branch_id AND periodo = _periodo
  LIMIT 1;

  IF v_ventas IS NULL THEN v_ventas := 0; END IF;

  RETURN QUERY
  SELECT
    rc.code as category_code,
    rc.name as category_name,
    rc.parent_code,
    rc.level,
    rc.rdo_section,
    rc.behavior,
    rc.sort_order,
    COALESCE(rd.total, 0) as total,
    CASE WHEN v_ventas > 0 THEN ROUND(COALESCE(rd.total, 0) / v_ventas * 100, 2) ELSE 0 END as percentage
  FROM rdo_categories rc
  LEFT JOIN (
    SELECT r.rdo_category_code, SUM(r.total) as total
    FROM rdo_report_data r
    WHERE r.branch_id = _branch_id AND r.periodo = _periodo
      AND r.rdo_category_code IS NOT NULL
    GROUP BY r.rdo_category_code
  ) rd ON rd.rdo_category_code = rc.code
  WHERE rc.is_active = true
  ORDER BY rc.sort_order;
END;
$$;
