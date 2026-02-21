-- RDO unificado: agrega desglose fiscal (IVA/neto) y CMV automático por rubro con detalle.

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
  v_cmv_por_rubro jsonb := '[]'::jsonb;
  v_items_sin_costo_count integer := 0;
  v_items_sin_costo_ventas numeric := 0;
  v_productos_sin_costo jsonb := '[]'::jsonb;
  v_total_facturado numeric := 0;
  v_total_facturado_bruto numeric := 0;
  v_total_facturado_neto_bruto numeric := 0;
  v_notas_credito_total numeric := 0;
  v_notas_credito_neto numeric := 0;
  v_total_ventas numeric := 0;
  v_iva_ventas numeric := 0;
  v_iva_ventas_bruto numeric := 0;
  v_iva_notas_credito numeric := 0;
  v_ventas_facturadas_netas numeric := 0;
  v_ventas_no_facturadas_netas numeric := 0;
  v_ventas_netas_rdo numeric := 0;
  v_compras_blanco_netas numeric := 0;
  v_compras_blanco_brutas numeric := 0;
  v_iva_compras numeric := 0;
  v_saldo_iva numeric := 0;
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

  v_total_ventas := COALESCE((v_multivista -> 'totales' ->> 'total_ventas')::numeric, 0);

  -- Facturación fiscal real (fuente: facturas_emitidas A/B/C)
  SELECT
    COALESCE(SUM(fe.total), 0),
    COALESCE(SUM(fe.neto), 0),
    COALESCE(SUM(fe.iva), 0)
  INTO v_total_facturado_bruto, v_total_facturado_neto_bruto, v_iva_ventas_bruto
  FROM public.facturas_emitidas fe
  LEFT JOIN public.pedidos p ON p.id = fe.pedido_id
  WHERE fe.branch_id = _branch_id
    AND fe.fecha_emision >= v_fecha_desde
    AND fe.fecha_emision <= v_fecha_hasta
    AND fe.tipo_comprobante IN ('A', 'B', 'C')
    AND (
      COALESCE(array_length(_canales, 1), 0) = 0
      OR public.normalize_rdo_channel(p.canal_venta, p.canal_app, p.tipo) = ANY(_canales)
    )
    AND (
      COALESCE(array_length(_medios, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM public.pedido_pagos pp
        WHERE pp.pedido_id = p.id
          AND public.normalize_rdo_payment_method(pp.metodo) = ANY(_medios)
      )
    )
    AND (
      (
        COALESCE(array_length(_categorias, 1), 0) = 0
        AND COALESCE(array_length(_productos, 1), 0) = 0
      )
      OR EXISTS (
        SELECT 1
        FROM public.pedido_items pi
        LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
        WHERE pi.pedido_id = p.id
          AND (
            COALESCE(array_length(_categorias, 1), 0) = 0
            OR COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) = ANY(_categorias)
          )
          AND (
            COALESCE(array_length(_productos, 1), 0) = 0
            OR pi.item_carta_id = ANY(_productos)
          )
      )
    );

  -- NC emitidas en el período: revierten base imponible e IVA de ventas facturadas.
  SELECT
    COALESCE(SUM(fe.total), 0),
    COALESCE(SUM(fe.neto), 0),
    COALESCE(SUM(fe.iva), 0)
  INTO v_notas_credito_total, v_notas_credito_neto, v_iva_notas_credito
  FROM public.facturas_emitidas fe
  LEFT JOIN public.pedidos p ON p.id = fe.pedido_id
  WHERE fe.branch_id = _branch_id
    AND fe.fecha_emision >= v_fecha_desde
    AND fe.fecha_emision <= v_fecha_hasta
    AND fe.tipo_comprobante IN ('NC_A', 'NC_B', 'NC_C')
    AND fe.factura_asociada_id IS NOT NULL
    AND (
      COALESCE(array_length(_canales, 1), 0) = 0
      OR public.normalize_rdo_channel(p.canal_venta, p.canal_app, p.tipo) = ANY(_canales)
    )
    AND (
      COALESCE(array_length(_medios, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM public.pedido_pagos pp
        WHERE pp.pedido_id = p.id
          AND public.normalize_rdo_payment_method(pp.metodo) = ANY(_medios)
      )
    )
    AND (
      (
        COALESCE(array_length(_categorias, 1), 0) = 0
        AND COALESCE(array_length(_productos, 1), 0) = 0
      )
      OR EXISTS (
        SELECT 1
        FROM public.pedido_items pi
        LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
        WHERE pi.pedido_id = p.id
          AND (
            COALESCE(array_length(_categorias, 1), 0) = 0
            OR COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) = ANY(_categorias)
          )
          AND (
            COALESCE(array_length(_productos, 1), 0) = 0
            OR pi.item_carta_id = ANY(_productos)
          )
      )
    );

  v_total_facturado := GREATEST(v_total_facturado_bruto - v_notas_credito_total, 0);

  -- Regla de negocio solicitada:
  -- - Venta facturada (en blanco): neto + IVA
  -- - Venta no facturada: neto total
  v_ventas_facturadas_netas := GREATEST(v_total_facturado_neto_bruto - v_notas_credito_neto, 0);
  v_iva_ventas := v_iva_ventas_bruto - v_iva_notas_credito;
  v_ventas_no_facturadas_netas := ROUND(v_total_ventas - v_total_facturado, 2);
  v_ventas_netas_rdo := ROUND(v_ventas_facturadas_netas + v_ventas_no_facturadas_netas, 2);

  -- Mantener sincronizado lo mostrado en multivista integrado del dashboard.
  v_multivista := jsonb_set(v_multivista, '{totales,total_facturado}', to_jsonb(v_total_facturado), true);
  v_multivista := jsonb_set(v_multivista, '{totales,total_no_facturado}', to_jsonb(v_total_ventas - v_total_facturado), true);

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
        'percentage', CASE WHEN v_ventas_netas_rdo > 0 THEN ROUND((r.total / v_ventas_netas_rdo) * 100, 2) ELSE 0 END
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

  -- CMV automatico por rubro configurado (rdo_category_code de item de carta)
  WITH base AS (
    SELECT
      ic.rdo_category_code AS category_code,
      pi.item_carta_id AS producto_id,
      COALESCE(pi.nombre, 'Sin nombre') AS producto_nombre,
      COALESCE(SUM(pi.cantidad), 0)::numeric AS cantidad,
      COALESCE(SUM(COALESCE(pi.cantidad, 0)::numeric * COALESCE(ic.costo_total, 0)::numeric), 0)::numeric AS total
    FROM public.pedidos p
    JOIN public.pedido_items pi ON pi.pedido_id = p.id
    LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
    WHERE p.branch_id = _branch_id
      AND p.estado IN ('entregado', 'listo')
      AND p.created_at::date >= v_fecha_desde
      AND p.created_at::date <= v_fecha_hasta
      AND ic.rdo_category_code ILIKE 'cmv%'
    GROUP BY ic.rdo_category_code, pi.item_carta_id, COALESCE(pi.nombre, 'Sin nombre')
  ),
  rubros AS (
    SELECT
      b.category_code,
      COALESCE(rc.name, b.category_code, 'Sin rubro') AS category_name,
      COALESCE(SUM(b.total), 0)::numeric AS total
    FROM base b
    LEFT JOIN public.rdo_categories rc ON rc.code = b.category_code
    GROUP BY b.category_code, COALESCE(rc.name, b.category_code, 'Sin rubro')
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category_code', r.category_code,
        'category_name', r.category_name,
        'total', r.total,
        'gastos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'producto_id', b.producto_id,
              'producto_nombre', b.producto_nombre,
              'cantidad', b.cantidad,
              'total', b.total
            )
            ORDER BY b.total DESC
          )
          FROM base b
          WHERE b.category_code = r.category_code
        ), '[]'::jsonb)
      )
      ORDER BY r.total DESC
    ),
    '[]'::jsonb
  )
  INTO v_cmv_por_rubro
  FROM rubros r;

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

  -- Compras en blanco/negro:
  -- - Blanco: neto + IVA (se expone desglosado)
  -- - Negro: solo neto (sin crédito fiscal)
  SELECT
    COALESCE(SUM(COALESCE(fp.subtotal_neto, fp.subtotal, 0)), 0),
    COALESCE(SUM(
      CASE
        WHEN (COALESCE(fp.iva_21, 0) + COALESCE(fp.iva_105, 0)) > 0
          THEN (COALESCE(fp.iva_21, 0) + COALESCE(fp.iva_105, 0))
        ELSE COALESCE(fp.iva, 0)
      END
    ), 0),
    COALESCE(SUM(COALESCE(fp.total_factura, fp.total, 0)), 0)
  INTO v_compras_blanco_netas, v_iva_compras, v_compras_blanco_brutas
  FROM public.facturas_proveedores fp
  WHERE fp.branch_id = _branch_id
    AND fp.periodo = _periodo
    AND fp.deleted_at IS NULL;

  v_saldo_iva := ROUND(v_iva_ventas - v_iva_compras, 2);

  RETURN jsonb_build_object(
    'periodo', _periodo,
    'fecha_desde', v_fecha_desde,
    'fecha_hasta', v_fecha_hasta,
    'multivista', COALESCE(v_multivista, '{}'::jsonb),
    'rdo_lines', COALESCE(v_rdo_lines, '[]'::jsonb),
    'cmv', jsonb_build_object(
      'cmv_auto', v_cmv_auto,
      'cmv_manual_ajuste', v_cmv_manual,
      'cmv_total', v_cmv_auto + v_cmv_manual,
      'por_rubro', COALESCE(v_cmv_por_rubro, '[]'::jsonb)
    ),
    'fiscal', jsonb_build_object(
      'ventas_brutas_totales', v_total_ventas,
      'ventas_facturadas_brutas_original', v_total_facturado_bruto,
      'ventas_facturadas_brutas', v_total_facturado,
      'notas_credito_brutas', v_notas_credito_total,
      'ventas_facturadas_netas', v_ventas_facturadas_netas,
      'ventas_no_facturadas_netas', v_ventas_no_facturadas_netas,
      'ventas_netas_rdo', v_ventas_netas_rdo,
      'iva_ventas_bruto', v_iva_ventas_bruto,
      'iva_notas_credito', v_iva_notas_credito,
      'iva_ventas', v_iva_ventas,
      'compras_blanco_brutas', v_compras_blanco_brutas,
      'compras_blanco_netas', v_compras_blanco_netas,
      'iva_compras', v_iva_compras,
      'saldo_iva', v_saldo_iva
    ),
    'diagnostico_costos', jsonb_build_object(
      'items_sin_costo_count', v_items_sin_costo_count,
      'ventas_afectadas', v_items_sin_costo_ventas,
      'productos_top_sin_costo', v_productos_sin_costo
    )
  );
END;
$$;
