-- RDO unificado: ventas multivista + costos + CMV automatico POS

CREATE OR REPLACE FUNCTION public.get_rdo_unified_report(
  _branch_id uuid,
  _periodo text,
  _canales text[] DEFAULT '{}'::text[],
  _medios text[] DEFAULT '{}'::text[],
  _categorias uuid[] DEFAULT '{}'::uuid[],
  _productos uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_fecha_desde date;
  v_fecha_hasta date;
  v_multivista jsonb;
  v_rdo_lines jsonb;
  v_cmv_auto numeric := 0;
  v_cmv_manual numeric := 0;
  v_items_sin_costo_count integer := 0;
  v_items_sin_costo_ventas numeric := 0;
  v_productos_sin_costo jsonb := '[]'::jsonb;
BEGIN
  v_fecha_desde := to_date(_periodo || '-01', 'YYYY-MM-DD');
  v_fecha_hasta := (v_fecha_desde + interval '1 month - 1 day')::date;

  -- Ventas multivista (respeta filtros)
  v_multivista := public.get_rdo_multivista(
    _branch_id,
    v_fecha_desde,
    v_fecha_hasta,
    _canales,
    _medios,
    _categorias,
    _productos
  );

  -- Lineas RDO actuales (costos variables/fijos)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category_code', r.category_code,
        'category_name', r.category_name,
        'parent_code', r.parent_code,
        'level', r.level,
        'rdo_section', r.rdo_section,
        'behavior', r.behavior,
        'sort_order', r.sort_order,
        'total', r.total,
        'percentage', r.percentage
      )
      ORDER BY r.sort_order
    ),
    '[]'::jsonb
  )
  INTO v_rdo_lines
  FROM public.get_rdo_report(_branch_id, _periodo) r;

  -- CMV manual existente (se interpreta como ajuste sobre CMV auto)
  SELECT COALESCE(SUM(r.total), 0)
  INTO v_cmv_manual
  FROM public.get_rdo_report(_branch_id, _periodo) r
  WHERE r.level = 3
    AND r.category_code ILIKE 'cmv%';

  -- CMV automatico desde POS (pedidos x costo de carta)
  SELECT COALESCE(SUM(COALESCE(pi.cantidad, 0)::numeric * COALESCE(ic.costo_total, 0)::numeric), 0)
  INTO v_cmv_auto
  FROM public.pedidos p
  JOIN public.pedido_items pi ON pi.pedido_id = p.id
  LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
  WHERE p.branch_id = _branch_id
    AND p.estado IN ('entregado', 'listo')
    AND p.created_at::date >= v_fecha_desde
    AND p.created_at::date <= v_fecha_hasta;

  -- Diagnostico de items vendidos sin costo
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(COALESCE(pi.subtotal, 0)), 0)
  INTO v_items_sin_costo_count, v_items_sin_costo_ventas
  FROM public.pedidos p
  JOIN public.pedido_items pi ON pi.pedido_id = p.id
  LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
  WHERE p.branch_id = _branch_id
    AND p.estado IN ('entregado', 'listo')
    AND p.created_at::date >= v_fecha_desde
    AND p.created_at::date <= v_fecha_hasta
    AND COALESCE(ic.costo_total, 0) <= 0;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'producto_id', t.producto_id,
        'producto_nombre', t.producto_nombre,
        'cantidad', t.cantidad,
        'ventas', t.ventas
      )
      ORDER BY t.ventas DESC
    ),
    '[]'::jsonb
  )
  INTO v_productos_sin_costo
  FROM (
    SELECT
      pi.item_carta_id AS producto_id,
      COALESCE(pi.nombre, 'Sin nombre') AS producto_nombre,
      COALESCE(SUM(pi.cantidad), 0)::numeric AS cantidad,
      COALESCE(SUM(pi.subtotal), 0)::numeric AS ventas
    FROM public.pedidos p
    JOIN public.pedido_items pi ON pi.pedido_id = p.id
    LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
    WHERE p.branch_id = _branch_id
      AND p.estado IN ('entregado', 'listo')
      AND p.created_at::date >= v_fecha_desde
      AND p.created_at::date <= v_fecha_hasta
      AND COALESCE(ic.costo_total, 0) <= 0
    GROUP BY pi.item_carta_id, pi.nombre
    ORDER BY ventas DESC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'periodo', _periodo,
    'fecha_desde', v_fecha_desde,
    'fecha_hasta', v_fecha_hasta,
    'multivista', COALESCE(v_multivista, '{}'::jsonb),
    'rdo_lines', COALESCE(v_rdo_lines, '[]'::jsonb),
    'cmv', jsonb_build_object(
      'cmv_auto', v_cmv_auto,
      'cmv_manual_ajuste', v_cmv_manual,
      'cmv_total', v_cmv_auto + v_cmv_manual
    ),
    'diagnostico_costos', jsonb_build_object(
      'items_sin_costo_count', v_items_sin_costo_count,
      'ventas_afectadas', v_items_sin_costo_ventas,
      'productos_top_sin_costo', v_productos_sin_costo
    )
  );
END;
$$;
