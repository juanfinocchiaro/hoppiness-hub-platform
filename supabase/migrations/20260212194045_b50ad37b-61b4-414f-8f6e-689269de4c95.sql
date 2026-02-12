
-- 1. Add puede_ser_extra to preparaciones and insumos
ALTER TABLE public.preparaciones ADD COLUMN IF NOT EXISTS puede_ser_extra boolean NOT NULL DEFAULT false;
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS puede_ser_extra boolean NOT NULL DEFAULT false;

-- Migrate existing: if precio_extra is set, mark as puede_ser_extra
UPDATE public.preparaciones SET puede_ser_extra = true WHERE precio_extra IS NOT NULL AND precio_extra > 0;
UPDATE public.insumos SET puede_ser_extra = true WHERE precio_extra IS NOT NULL AND precio_extra > 0;

-- 2. Create item_carta_extras table
CREATE TABLE public.item_carta_extras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_carta_id uuid NOT NULL REFERENCES public.items_carta(id) ON DELETE CASCADE,
  preparacion_id uuid REFERENCES public.preparaciones(id),
  insumo_id uuid REFERENCES public.insumos(id),
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_carta_extras_one_ref CHECK (
    (preparacion_id IS NOT NULL AND insumo_id IS NULL) OR
    (preparacion_id IS NULL AND insumo_id IS NOT NULL)
  )
);

-- Index for fast lookups
CREATE INDEX idx_item_carta_extras_item ON public.item_carta_extras(item_carta_id);

-- 3. Remove es_extra from item_carta_composicion (keep es_removible)
ALTER TABLE public.item_carta_composicion DROP COLUMN IF EXISTS es_extra;

-- 4. RLS policies (same pattern as item_carta_composicion)
ALTER TABLE public.item_carta_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read item extras"
  ON public.item_carta_extras FOR SELECT
  USING (is_staff());

CREATE POLICY "Financial managers can insert item extras"
  ON public.item_carta_extras FOR INSERT
  WITH CHECK (is_financial_manager(auth.uid()));

CREATE POLICY "Financial managers can update item extras"
  ON public.item_carta_extras FOR UPDATE
  USING (is_financial_manager(auth.uid()));

CREATE POLICY "Financial managers can delete item extras"
  ON public.item_carta_extras FOR DELETE
  USING (is_financial_manager(auth.uid()));
