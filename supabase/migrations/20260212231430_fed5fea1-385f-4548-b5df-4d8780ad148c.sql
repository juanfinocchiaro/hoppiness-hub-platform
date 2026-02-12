
-- 1. NEW TABLE: item_removibles (ingredient-level removables)
CREATE TABLE public.item_removibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_carta_id uuid NOT NULL REFERENCES public.items_carta(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  nombre_display text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_carta_id, insumo_id)
);

COMMENT ON TABLE public.item_removibles IS
  'Ingredientes individuales que el cliente puede pedir SIN para cada item de carta.';

-- RLS
ALTER TABLE public.item_removibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read item_removibles" ON public.item_removibles
  FOR SELECT USING (is_staff());

CREATE POLICY "Staff can manage item_removibles" ON public.item_removibles
  FOR ALL USING (is_staff());

-- 2. ADD es_extra to item_carta_composicion
ALTER TABLE public.item_carta_composicion
  ADD COLUMN IF NOT EXISTS es_extra boolean DEFAULT false;

COMMENT ON COLUMN public.item_carta_composicion.es_extra IS
  'If true, this component is offered as an extra with charge. If cantidad = 0, it only exists as extra (does not add to base cost). Price comes from preparaciones.precio_extra or insumos.precio_extra.';

-- 3. ADD fc_objetivo_extra to preparaciones and insumos
ALTER TABLE public.preparaciones ADD COLUMN IF NOT EXISTS fc_objetivo_extra numeric DEFAULT 30;
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS fc_objetivo_extra numeric DEFAULT 30;

-- 4. DROP old es_removible column
ALTER TABLE public.item_carta_composicion DROP COLUMN IF EXISTS es_removible;

-- 5. DROP item_extra_asignaciones table (from previous implementation)
DROP TABLE IF EXISTS public.item_extra_asignaciones;

-- 6. Update recalcular_costo_item_carta to only count cantidad > 0
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
  -- Only count components with cantidad > 0 for base cost
  SELECT COALESCE(SUM(
    ic.cantidad * COALESCE(p.costo_calculado, i.costo_por_unidad_base, 0)
  ), 0)
  INTO v_costo_fijo
  FROM item_carta_composicion ic
  LEFT JOIN preparaciones p ON p.id = ic.preparacion_id
  LEFT JOIN insumos i ON i.id = ic.insumo_id
  WHERE ic.item_carta_id = _item_id
    AND ic.cantidad > 0;

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
