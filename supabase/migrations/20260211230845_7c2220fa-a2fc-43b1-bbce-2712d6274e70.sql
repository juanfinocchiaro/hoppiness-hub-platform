
-- 1. Create table for optional groups
CREATE TABLE public.item_carta_grupo_opcional (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_carta_id UUID NOT NULL REFERENCES public.items_carta(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  costo_promedio NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create table for items within optional groups
CREATE TABLE public.item_carta_grupo_opcional_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.item_carta_grupo_opcional(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES public.insumos(id),
  preparacion_id UUID REFERENCES public.preparaciones(id),
  cantidad NUMERIC(10,4) NOT NULL DEFAULT 1,
  costo_unitario NUMERIC(12,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_one_source CHECK (
    (insumo_id IS NOT NULL AND preparacion_id IS NULL)
    OR (insumo_id IS NULL AND preparacion_id IS NOT NULL)
  )
);

-- 3. Enable RLS
ALTER TABLE public.item_carta_grupo_opcional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_carta_grupo_opcional_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (staff can read, financial managers can write)
CREATE POLICY "Staff can view optional groups"
  ON public.item_carta_grupo_opcional FOR SELECT
  USING (is_staff());

CREATE POLICY "Financial managers can manage optional groups"
  ON public.item_carta_grupo_opcional FOR ALL
  USING (is_financial_manager(auth.uid()));

CREATE POLICY "Staff can view optional group items"
  ON public.item_carta_grupo_opcional_items FOR SELECT
  USING (is_staff());

CREATE POLICY "Financial managers can manage optional group items"
  ON public.item_carta_grupo_opcional_items FOR ALL
  USING (is_financial_manager(auth.uid()));

-- 5. Remove old optional columns from item_carta_composicion
ALTER TABLE public.item_carta_composicion
  DROP COLUMN IF EXISTS es_opcional,
  DROP COLUMN IF EXISTS costo_promedio_override;

-- 6. Update recalcular_costo_item_carta to include optional groups
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
BEGIN
  -- Sum from fixed composition
  SELECT COALESCE(SUM(
    ic.cantidad * COALESCE(p.costo_calculado, i.costo_por_unidad_base, 0)
  ), 0)
  INTO v_costo_fijo
  FROM item_carta_composicion ic
  LEFT JOIN preparaciones p ON p.id = ic.preparacion_id
  LEFT JOIN insumos i ON i.id = ic.insumo_id
  WHERE ic.item_carta_id = _item_id;

  -- Sum average cost from optional groups
  SELECT COALESCE(SUM(g.costo_promedio), 0)
  INTO v_costo_grupos
  FROM item_carta_grupo_opcional g
  WHERE g.item_carta_id = _item_id;

  v_costo := v_costo_fijo + v_costo_grupos;

  SELECT precio_base INTO v_precio FROM items_carta WHERE id = _item_id;

  UPDATE items_carta
  SET costo_total = v_costo,
      fc_actual = CASE WHEN v_precio > 0 THEN ROUND((v_costo / v_precio * 100)::numeric, 2) ELSE NULL END
  WHERE id = _item_id;
END;
$function$;

-- 7. Triggers for updated_at
CREATE TRIGGER update_grupo_opcional_updated_at
  BEFORE UPDATE ON public.item_carta_grupo_opcional
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
