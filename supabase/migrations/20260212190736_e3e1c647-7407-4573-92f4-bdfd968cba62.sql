
-- 1. Fix recalcular_costo_item_carta to use precio neto (sin IVA)
CREATE OR REPLACE FUNCTION public.recalcular_costo_item_carta(_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_costo_fijo DECIMAL(12,2) := 0;
  v_costo_grupos DECIMAL(12,2) := 0;
  v_costo DECIMAL(12,2) := 0;
  v_precio DECIMAL(12,2);
  v_precio_neto DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(
    ic.cantidad * COALESCE(p.costo_calculado, i.costo_por_unidad_base, 0)
  ), 0)
  INTO v_costo_fijo
  FROM item_carta_composicion ic
  LEFT JOIN preparaciones p ON p.id = ic.preparacion_id
  LEFT JOIN insumos i ON i.id = ic.insumo_id
  WHERE ic.item_carta_id = _item_id;

  SELECT COALESCE(SUM(g.costo_promedio), 0)
  INTO v_costo_grupos
  FROM item_carta_grupo_opcional g
  WHERE g.item_carta_id = _item_id;

  v_costo := v_costo_fijo + v_costo_grupos;

  SELECT precio_base INTO v_precio FROM items_carta WHERE id = _item_id;
  
  -- Precio neto = precio sin IVA (21%)
  v_precio_neto := CASE WHEN v_precio > 0 THEN v_precio / 1.21 ELSE 0 END;

  UPDATE items_carta
  SET costo_total = v_costo,
      fc_actual = CASE WHEN v_precio_neto > 0 THEN ROUND((v_costo / v_precio_neto * 100)::numeric, 2) ELSE NULL END
  WHERE id = _item_id;
END;
$function$;

-- 2. Update v_menu_costos view to also use precio neto
CREATE OR REPLACE VIEW v_menu_costos AS
SELECT mp.id AS menu_producto_id,
    mp.nombre,
    mp.tipo,
    mp.categoria_id,
    mp.insumo_id,
    mp.rdo_category_code,
    mc.nombre AS categoria_nombre,
    rc.name AS rdo_category_name,
    mpr.precio_base,
    mpr.fc_objetivo,
    COALESCE(
        CASE
            WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
            WHEN mp.tipo = 'elaborado' THEN (SELECT sum(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad = ANY (ARRAY['kg','l']) THEN 1000 ELSE 1 END::numeric) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
            ELSE 0::numeric
        END, 0::numeric) AS costo_teorico,
    CASE
        WHEN mpr.precio_base > 0 AND COALESCE(
            CASE
                WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
                WHEN mp.tipo = 'elaborado' THEN (SELECT sum(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad = ANY (ARRAY['kg','l']) THEN 1000 ELSE 1 END::numeric) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
                ELSE 0::numeric
            END, 0::numeric) > 0 
        THEN round(COALESCE(
            CASE
                WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
                WHEN mp.tipo = 'elaborado' THEN (SELECT sum(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad = ANY (ARRAY['kg','l']) THEN 1000 ELSE 1 END::numeric) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
                ELSE 0::numeric
            END, 0::numeric) / (mpr.precio_base / 1.21) * 100, 2)
        ELSE NULL::numeric
    END AS fc_actual,
    CASE
        WHEN mpr.fc_objetivo > 0 AND COALESCE(
            CASE
                WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
                WHEN mp.tipo = 'elaborado' THEN (SELECT sum(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad = ANY (ARRAY['kg','l']) THEN 1000 ELSE 1 END::numeric) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
                ELSE 0::numeric
            END, 0::numeric) > 0 
        THEN round(COALESCE(
            CASE
                WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
                WHEN mp.tipo = 'elaborado' THEN (SELECT sum(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad = ANY (ARRAY['kg','l']) THEN 1000 ELSE 1 END::numeric) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
                ELSE 0::numeric
            END, 0::numeric) / (mpr.fc_objetivo / 100), 0)
        ELSE NULL::numeric
    END AS precio_sugerido
FROM menu_productos mp
LEFT JOIN menu_categorias mc ON mc.id = mp.categoria_id
LEFT JOIN menu_precios mpr ON mpr.menu_producto_id = mp.id
LEFT JOIN rdo_categories rc ON rc.code = mp.rdo_category_code
WHERE mp.activo = true;

-- 3. Recalculate all existing items with the corrected formula
SELECT recalcular_todos_los_costos();
