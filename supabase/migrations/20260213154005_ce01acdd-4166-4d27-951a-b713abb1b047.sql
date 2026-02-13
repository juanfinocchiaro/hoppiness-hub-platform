
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
  v_ref_prep_id UUID;
  v_ref_insumo_id UUID;
  v_has_composicion BOOLEAN;
BEGIN
  -- Check if item has explicit composition rows
  SELECT EXISTS(
    SELECT 1 FROM item_carta_composicion WHERE item_carta_id = _item_id
  ) INTO v_has_composicion;

  IF v_has_composicion THEN
    -- Standard path: sum from composition table
    SELECT COALESCE(SUM(
      ic.cantidad * COALESCE(p.costo_calculado, i.costo_por_unidad_base, 0)
    ), 0)
    INTO v_costo_fijo
    FROM item_carta_composicion ic
    LEFT JOIN preparaciones p ON p.id = ic.preparacion_id
    LEFT JOIN insumos i ON i.id = ic.insumo_id
    WHERE ic.item_carta_id = _item_id
      AND ic.cantidad > 0;
  ELSE
    -- Fallback: check direct reference fields (extras auto-generated)
    SELECT composicion_ref_preparacion_id, composicion_ref_insumo_id
    INTO v_ref_prep_id, v_ref_insumo_id
    FROM items_carta WHERE id = _item_id;

    IF v_ref_prep_id IS NOT NULL THEN
      SELECT COALESCE(costo_calculado, 0) INTO v_costo_fijo
      FROM preparaciones WHERE id = v_ref_prep_id;
    ELSIF v_ref_insumo_id IS NOT NULL THEN
      SELECT COALESCE(costo_por_unidad_base, 0) INTO v_costo_fijo
      FROM insumos WHERE id = v_ref_insumo_id;
    END IF;
  END IF;

  SELECT COALESCE(SUM(g.costo_promedio), 0)
  INTO v_costo_grupos
  FROM item_carta_grupo_opcional g
  WHERE g.item_carta_id = _item_id;

  v_costo := v_costo_fijo + v_costo_grupos;

  SELECT precio_base INTO v_precio FROM items_carta WHERE id = _item_id;
  
  v_precio_neto := CASE WHEN v_precio > 0 THEN v_precio / 1.21 ELSE 0 END;

  UPDATE items_carta
  SET costo_total = v_costo,
      fc_actual = CASE WHEN v_precio_neto > 0 THEN ROUND((v_costo / v_precio_neto * 100)::numeric, 2) ELSE NULL END
  WHERE id = _item_id;
END;
$function$;
