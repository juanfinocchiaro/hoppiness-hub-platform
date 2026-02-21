-- RDO Multivista: vistas base + RPC de agregación.
-- Fuente de reglas de facturación: afip_config.reglas_facturacion

CREATE OR REPLACE FUNCTION public.normalize_rdo_channel(
  _canal_venta text,
  _canal_app text,
  _tipo text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _canal_venta = 'apps' THEN
      CASE
        WHEN _canal_app = 'rappi' THEN 'rappi'
        WHEN _canal_app = 'pedidos_ya' THEN 'pedidosya'
        WHEN _canal_app = 'pedidosya' THEN 'pedidosya'
        WHEN _canal_app = 'mp_delivery' THEN 'mp_delivery'
        ELSE 'apps'
      END
    WHEN _canal_venta = 'mostrador' THEN
      CASE
        WHEN _tipo = 'webapp' THEN 'webapp'
        ELSE 'mostrador'
      END
    WHEN _tipo = 'webapp' THEN 'webapp'
    ELSE COALESCE(_canal_venta, _tipo, 'mostrador')
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_rdo_payment_method(_metodo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _metodo IN ('efectivo') THEN 'efectivo'
    WHEN _metodo IN ('debito', 'tarjeta_debito') THEN 'debito'
    WHEN _metodo IN ('credito', 'tarjeta_credito') THEN 'credito'
    WHEN _metodo IN ('qr', 'mercadopago', 'mercadopago_qr') THEN 'qr'
    WHEN _metodo = 'transferencia' THEN 'transferencia'
    ELSE COALESCE(_metodo, 'otro')
  END;
$$;

CREATE OR REPLACE VIEW public.rdo_multivista_ventas_base AS
SELECT
  p.id AS pedido_id,
  p.branch_id,
  p.created_at::date AS fecha,
  p.created_at,
  public.normalize_rdo_channel(p.canal_venta, p.canal_app, p.tipo) AS canal,
  COALESCE(p.total, 0)::numeric AS total
FROM public.pedidos p
WHERE p.estado IN ('entregado', 'listo');

CREATE OR REPLACE VIEW public.rdo_multivista_items_base AS
SELECT
  pi.id AS item_id,
  pi.pedido_id,
  p.branch_id,
  p.created_at::date AS fecha,
  public.normalize_rdo_channel(p.canal_venta, p.canal_app, p.tipo) AS canal,
  pi.item_carta_id AS producto_id,
  COALESCE(pi.nombre, 'Sin nombre') AS producto_nombre,
  COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) AS categoria_id,
  COALESCE(mc.nombre, 'Sin categoría') AS categoria_nombre,
  COALESCE(pi.cantidad, 0)::numeric AS cantidad,
  COALESCE(pi.subtotal, 0)::numeric AS ventas,
  COALESCE(ic.costo_total, 0)::numeric AS costo_unitario,
  (COALESCE(pi.cantidad, 0)::numeric * COALESCE(ic.costo_total, 0)::numeric) AS costo_total
FROM public.pedido_items pi
JOIN public.pedidos p ON p.id = pi.pedido_id
LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
LEFT JOIN public.menu_categorias mc ON mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id)
WHERE p.estado IN ('entregado', 'listo');

CREATE INDEX IF NOT EXISTS idx_pedidos_branch_fecha_estado_rdo_mv
  ON public.pedidos (branch_id, created_at, estado);

CREATE INDEX IF NOT EXISTS idx_pedidos_canal_rdo_mv
  ON public.pedidos (canal_venta, canal_app, tipo);

CREATE INDEX IF NOT EXISTS idx_pedido_pagos_pedido_metodo_rdo_mv
  ON public.pedido_pagos (pedido_id, metodo);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_categoria_producto_rdo_mv
  ON public.pedido_items (pedido_id, categoria_carta_id, item_carta_id);

CREATE OR REPLACE FUNCTION public.get_rdo_multivista(
  _branch_id uuid,
  _fecha_desde date,
  _fecha_hasta date,
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
  v_item_filter_active boolean := COALESCE(array_length(_categorias, 1), 0) > 0 OR COALESCE(array_length(_productos, 1), 0) > 0;
  v_result jsonb;
BEGIN
  WITH pedidos_scope AS (
    SELECT
      p.id AS pedido_id,
      p.branch_id,
      p.created_at::date AS fecha,
      p.created_at,
      public.normalize_rdo_channel(p.canal_venta, p.canal_app, p.tipo) AS canal,
      COALESCE(p.total, 0)::numeric AS total,
      COALESCE(
        ac.reglas_facturacion,
        '{
          "canales_internos": {
            "efectivo": false,
            "debito": true,
            "credito": true,
            "qr": true,
            "transferencia": true
          },
          "canales_externos": {
            "rappi": true,
            "pedidosya": true,
            "mas_delivery_efectivo": false,
            "mas_delivery_digital": true,
            "mp_delivery": true
          }
        }'::jsonb
      ) AS reglas_facturacion
    FROM public.pedidos p
    LEFT JOIN public.afip_config ac ON ac.branch_id = p.branch_id
    WHERE p.branch_id = _branch_id
      AND p.estado IN ('entregado', 'listo')
      AND p.created_at::date >= _fecha_desde
      AND p.created_at::date <= _fecha_hasta
      AND (
        COALESCE(array_length(_canales, 1), 0) = 0
        OR public.normalize_rdo_channel(p.canal_venta, p.canal_app, p.tipo) = ANY(_canales)
      )
  ),
  pagos_scope AS (
    SELECT
      pp.id AS pago_id,
      pp.pedido_id,
      public.normalize_rdo_payment_method(pp.metodo) AS medio_pago,
      COALESCE(pp.monto, 0)::numeric AS monto
    FROM public.pedido_pagos pp
    JOIN pedidos_scope ps ON ps.pedido_id = pp.pedido_id
  ),
  pedidos_filtrados AS (
    SELECT ps.*
    FROM pedidos_scope ps
    WHERE
      COALESCE(array_length(_medios, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM pagos_scope pg
        WHERE pg.pedido_id = ps.pedido_id
          AND pg.medio_pago = ANY(_medios)
      )
  ),
  pagos_filtrados AS (
    SELECT pg.*
    FROM pagos_scope pg
    JOIN pedidos_filtrados pf ON pf.pedido_id = pg.pedido_id
    WHERE
      COALESCE(array_length(_medios, 1), 0) = 0
      OR pg.medio_pago = ANY(_medios)
  ),
  pagos_con_facturacion AS (
    SELECT
      pg.pago_id,
      pg.pedido_id,
      pg.medio_pago,
      pg.monto,
      pf.canal,
      pf.total AS total_pedido,
      CASE
        WHEN pf.canal = 'rappi' THEN COALESCE((pf.reglas_facturacion -> 'canales_externos' ->> 'rappi')::boolean, false)
        WHEN pf.canal = 'pedidosya' THEN COALESCE((pf.reglas_facturacion -> 'canales_externos' ->> 'pedidosya')::boolean, false)
        WHEN pf.canal = 'mp_delivery' THEN COALESCE((pf.reglas_facturacion -> 'canales_externos' ->> 'mp_delivery')::boolean, false)
        WHEN pf.canal = 'mostrador' OR pf.canal = 'webapp' THEN
          CASE pg.medio_pago
            WHEN 'efectivo' THEN COALESCE((pf.reglas_facturacion -> 'canales_internos' ->> 'efectivo')::boolean, false)
            WHEN 'debito' THEN COALESCE((pf.reglas_facturacion -> 'canales_internos' ->> 'debito')::boolean, false)
            WHEN 'credito' THEN COALESCE((pf.reglas_facturacion -> 'canales_internos' ->> 'credito')::boolean, false)
            WHEN 'qr' THEN COALESCE((pf.reglas_facturacion -> 'canales_internos' ->> 'qr')::boolean, false)
            WHEN 'transferencia' THEN COALESCE((pf.reglas_facturacion -> 'canales_internos' ->> 'transferencia')::boolean, false)
            ELSE false
          END
        ELSE false
      END AS es_facturable
    FROM pagos_filtrados pg
    JOIN pedidos_filtrados pf ON pf.pedido_id = pg.pedido_id
  ),
  items_catalogo AS (
    SELECT
      pi.pedido_id,
      pi.item_carta_id AS producto_id,
      COALESCE(pi.nombre, 'Sin nombre') AS producto_nombre,
      COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) AS categoria_id,
      COALESCE(mc.nombre, 'Sin categoría') AS categoria_nombre,
      COALESCE(pi.cantidad, 0)::numeric AS cantidad,
      COALESCE(pi.subtotal, 0)::numeric AS ventas,
      COALESCE(ic.costo_total, 0)::numeric AS costo_unitario
    FROM public.pedido_items pi
    JOIN pedidos_filtrados pf ON pf.pedido_id = pi.pedido_id
    LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
    LEFT JOIN public.menu_categorias mc ON mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id)
  ),
  items_filtrados AS (
    SELECT *
    FROM items_catalogo ic
    WHERE
      (COALESCE(array_length(_categorias, 1), 0) = 0 OR ic.categoria_id = ANY(_categorias))
      AND (COALESCE(array_length(_productos, 1), 0) = 0 OR ic.producto_id = ANY(_productos))
  ),
  items_en_uso AS (
    SELECT *
    FROM (
      SELECT * FROM items_filtrados WHERE v_item_filter_active
      UNION ALL
      SELECT * FROM items_catalogo WHERE NOT v_item_filter_active
    ) t
  ),
  scope_por_pedido AS (
    SELECT
      pf.pedido_id,
      pf.canal,
      pf.total AS total_pedido,
      CASE
        WHEN v_item_filter_active THEN COALESCE(SUM(ifu.ventas), 0)
        ELSE pf.total
      END AS ventas_scope
    FROM pedidos_filtrados pf
    LEFT JOIN items_filtrados ifu ON ifu.pedido_id = pf.pedido_id
    GROUP BY pf.pedido_id, pf.canal, pf.total
    HAVING
      (NOT v_item_filter_active)
      OR COALESCE(SUM(ifu.ventas), 0) > 0
  ),
  total_scope AS (
    SELECT
      COALESCE(SUM(sp.ventas_scope), 0)::numeric AS total_ventas,
      COUNT(*)::int AS total_pedidos
    FROM scope_por_pedido sp
  ),
  total_facturado AS (
    SELECT
      COALESCE(SUM(
        CASE
          WHEN pcf.es_facturable THEN
            pcf.monto * CASE
              WHEN pcf.total_pedido > 0 THEN sp.ventas_scope / pcf.total_pedido
              ELSE 0
            END
          ELSE 0
        END
      ), 0)::numeric AS total_facturado
    FROM pagos_con_facturacion pcf
    JOIN scope_por_pedido sp ON sp.pedido_id = pcf.pedido_id
  ),
  por_canal AS (
    SELECT
      sp.canal,
      COUNT(*)::int AS pedidos,
      COALESCE(SUM(sp.ventas_scope), 0)::numeric AS ventas
    FROM scope_por_pedido sp
    GROUP BY sp.canal
  ),
  pagos_alloc AS (
    SELECT
      pcf.medio_pago,
      pcf.pedido_id,
      (pcf.monto * CASE WHEN pcf.total_pedido > 0 THEN sp.ventas_scope / pcf.total_pedido ELSE 0 END)::numeric AS ventas_alloc,
      (CASE
        WHEN pcf.es_facturable THEN pcf.monto * CASE WHEN pcf.total_pedido > 0 THEN sp.ventas_scope / pcf.total_pedido ELSE 0 END
        ELSE 0
      END)::numeric AS facturado_alloc
    FROM pagos_con_facturacion pcf
    JOIN scope_por_pedido sp ON sp.pedido_id = pcf.pedido_id
  ),
  por_medio AS (
    SELECT
      pa.medio_pago,
      COUNT(DISTINCT pa.pedido_id)::int AS pedidos,
      COALESCE(SUM(pa.ventas_alloc), 0)::numeric AS ventas,
      COALESCE(SUM(pa.facturado_alloc), 0)::numeric AS facturado
    FROM pagos_alloc pa
    GROUP BY pa.medio_pago
  ),
  total_items AS (
    SELECT COALESCE(SUM(iu.ventas), 0)::numeric AS total_items_ventas
    FROM items_en_uso iu
  ),
  por_categoria AS (
    SELECT
      iu.categoria_id,
      COALESCE(iu.categoria_nombre, 'Sin categoría') AS categoria_nombre,
      COALESCE(SUM(iu.cantidad), 0)::numeric AS cantidad,
      COALESCE(SUM(iu.ventas), 0)::numeric AS ventas,
      COALESCE(SUM(iu.cantidad * iu.costo_unitario), 0)::numeric AS costo_total
    FROM items_en_uso iu
    GROUP BY iu.categoria_id, iu.categoria_nombre
  ),
  por_producto AS (
    SELECT
      iu.producto_id,
      COALESCE(iu.producto_nombre, 'Sin nombre') AS producto_nombre,
      iu.categoria_id,
      COALESCE(iu.categoria_nombre, 'Sin categoría') AS categoria_nombre,
      COALESCE(SUM(iu.cantidad), 0)::numeric AS cantidad,
      COALESCE(SUM(iu.ventas), 0)::numeric AS ventas,
      COALESCE(SUM(iu.cantidad * iu.costo_unitario), 0)::numeric AS costo_total
    FROM items_en_uso iu
    GROUP BY iu.producto_id, iu.producto_nombre, iu.categoria_id, iu.categoria_nombre
  )
  SELECT jsonb_build_object(
    'totales', jsonb_build_object(
      'total_ventas', ts.total_ventas,
      'total_pedidos', ts.total_pedidos,
      'ticket_promedio', CASE WHEN ts.total_pedidos > 0 THEN ts.total_ventas / ts.total_pedidos ELSE 0 END,
      'total_facturado', tf.total_facturado,
      'total_no_facturado', ts.total_ventas - tf.total_facturado
    ),
    'por_canal', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'canal', pc.canal,
          'pedidos', pc.pedidos,
          'ventas', pc.ventas,
          'porcentaje', CASE WHEN ts.total_ventas > 0 THEN (pc.ventas / ts.total_ventas) * 100 ELSE 0 END,
          'ticket_promedio', CASE WHEN pc.pedidos > 0 THEN pc.ventas / pc.pedidos ELSE 0 END
        )
        ORDER BY pc.ventas DESC
      )
      FROM por_canal pc
    ), '[]'::jsonb),
    'por_medio_pago', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'medio_pago', pm.medio_pago,
          'pedidos', pm.pedidos,
          'ventas', pm.ventas,
          'porcentaje', CASE WHEN ts.total_ventas > 0 THEN (pm.ventas / ts.total_ventas) * 100 ELSE 0 END,
          'facturado', pm.facturado
        )
        ORDER BY pm.ventas DESC
      )
      FROM por_medio pm
    ), '[]'::jsonb),
    'por_categoria', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'categoria_id', pc.categoria_id,
          'categoria_nombre', pc.categoria_nombre,
          'cantidad', pc.cantidad,
          'ventas', pc.ventas,
          'porcentaje', CASE WHEN ti.total_items_ventas > 0 THEN (pc.ventas / ti.total_items_ventas) * 100 ELSE 0 END,
          'costo_total', pc.costo_total,
          'food_cost', CASE WHEN pc.ventas > 0 THEN (pc.costo_total / pc.ventas) * 100 ELSE 0 END
        )
        ORDER BY pc.ventas DESC
      )
      FROM por_categoria pc
      CROSS JOIN total_items ti
    ), '[]'::jsonb),
    'por_producto', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'producto_id', pp.producto_id,
          'producto_nombre', pp.producto_nombre,
          'categoria_id', pp.categoria_id,
          'categoria_nombre', pp.categoria_nombre,
          'cantidad', pp.cantidad,
          'ventas', pp.ventas,
          'porcentaje', CASE WHEN ti.total_items_ventas > 0 THEN (pp.ventas / ti.total_items_ventas) * 100 ELSE 0 END,
          'food_cost', CASE WHEN pp.ventas > 0 THEN (pp.costo_total / pp.ventas) * 100 ELSE 0 END
        )
        ORDER BY pp.ventas DESC
      )
      FROM por_producto pp
      CROSS JOIN total_items ti
    ), '[]'::jsonb),
    'opciones_filtros', jsonb_build_object(
      'canales', jsonb_build_array(
        jsonb_build_object('id', 'mostrador', 'label', 'Mostrador'),
        jsonb_build_object('id', 'webapp', 'label', 'WebApp'),
        jsonb_build_object('id', 'rappi', 'label', 'Rappi'),
        jsonb_build_object('id', 'pedidosya', 'label', 'PedidosYa'),
        jsonb_build_object('id', 'mp_delivery', 'label', 'MP Delivery')
      ),
      'medios_pago', jsonb_build_array(
        jsonb_build_object('id', 'efectivo', 'label', 'Efectivo'),
        jsonb_build_object('id', 'debito', 'label', 'Débito'),
        jsonb_build_object('id', 'credito', 'label', 'Crédito'),
        jsonb_build_object('id', 'qr', 'label', 'QR'),
        jsonb_build_object('id', 'transferencia', 'label', 'Transferencia')
      ),
      'categorias', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sub.categoria_id,
            'nombre', sub.categoria_nombre
          )
          ORDER BY sub.categoria_nombre
        )
        FROM (
          SELECT DISTINCT ic.categoria_id, ic.categoria_nombre
          FROM items_catalogo ic
          WHERE ic.categoria_id IS NOT NULL
        ) sub
      ), '[]'::jsonb),
      'productos', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sub.producto_id,
            'nombre', sub.producto_nombre,
            'categoria_id', sub.categoria_id,
            'categoria_nombre', sub.categoria_nombre
          )
          ORDER BY sub.producto_nombre
        )
        FROM (
          SELECT DISTINCT ic.producto_id, ic.producto_nombre, ic.categoria_id, ic.categoria_nombre
          FROM items_catalogo ic
          WHERE ic.producto_id IS NOT NULL
        ) sub
      ), '[]'::jsonb)
    )
  )
  INTO v_result
  FROM total_scope ts
  CROSS JOIN total_facturado tf;

  RETURN COALESCE(
    v_result,
    jsonb_build_object(
      'totales', jsonb_build_object(
        'total_ventas', 0,
        'total_pedidos', 0,
        'ticket_promedio', 0,
        'total_facturado', 0,
        'total_no_facturado', 0
      ),
      'por_canal', '[]'::jsonb,
      'por_medio_pago', '[]'::jsonb,
      'por_categoria', '[]'::jsonb,
      'por_producto', '[]'::jsonb,
      'opciones_filtros', jsonb_build_object(
        'canales', '[]'::jsonb,
        'medios_pago', '[]'::jsonb,
        'categorias', '[]'::jsonb,
        'productos', '[]'::jsonb
      )
    )
  );
END;
$$;
