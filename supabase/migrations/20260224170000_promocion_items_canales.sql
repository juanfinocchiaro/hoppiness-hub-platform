-- Promotions rework: product-centric with channel targeting

-- Join table: each promotion can have one or more items imported from carta
CREATE TABLE IF NOT EXISTS public.promocion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promocion_id uuid NOT NULL REFERENCES public.promociones(id) ON DELETE CASCADE,
  item_carta_id uuid NOT NULL REFERENCES public.items_carta(id),
  precio_promo numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promocion_items_promo ON public.promocion_items(promocion_id);
CREATE INDEX IF NOT EXISTS idx_promocion_items_item ON public.promocion_items(item_carta_id);

-- Channel targeting for promotions
ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS canales text[] DEFAULT '{webapp,salon,rappi,pedidos_ya}';

COMMENT ON COLUMN public.promociones.canales IS
  'Channels where this promo is visible: webapp, salon, rappi, pedidos_ya';

-- RLS for promocion_items
ALTER TABLE public.promocion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_promo_items" ON public.promocion_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_promo_items" ON public.promocion_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_promo_items" ON public.promocion_items
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_promo_items" ON public.promocion_items
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "anon_select_promo_items" ON public.promocion_items
  FOR SELECT TO anon USING (true);
