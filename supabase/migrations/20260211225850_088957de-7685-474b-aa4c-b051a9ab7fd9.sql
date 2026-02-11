
-- Add optional component columns to item_carta_composicion
ALTER TABLE public.item_carta_composicion 
  ADD COLUMN IF NOT EXISTS es_opcional BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS costo_promedio_override NUMERIC(12,2);

-- Update recalcular_costo_item_carta to handle optional components
CREATE OR REPLACE FUNCTION public.recalcular_costo_item_carta(_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_costo DECIMAL(12,2) := 0;
  v_precio DECIMAL(12,2);
BEGIN
  -- Sum from composition, using costo_promedio_override for optional components
  SELECT COALESCE(SUM(
    CASE 
      WHEN ic.es_opcional AND ic.costo_promedio_override IS NOT NULL THEN
        ic.cantidad * ic.costo_promedio_override
      WHEN ic.es_opcional THEN
        0 -- optional without override = 0 cost
      ELSE
        ic.cantidad * COALESCE(
          p.costo_calculado,
          i.costo_por_unidad_base,
          0
        )
    END
  ), 0)
  INTO v_costo
  FROM item_carta_composicion ic
  LEFT JOIN preparaciones p ON p.id = ic.preparacion_id
  LEFT JOIN insumos i ON i.id = ic.insumo_id
  WHERE ic.item_carta_id = _item_id;

  SELECT precio_base INTO v_precio FROM items_carta WHERE id = _item_id;

  UPDATE items_carta 
  SET costo_total = v_costo,
      fc_actual = CASE WHEN v_precio > 0 THEN ROUND((v_costo / v_precio * 100)::numeric, 2) ELSE NULL END
  WHERE id = _item_id;
END;
$function$;
