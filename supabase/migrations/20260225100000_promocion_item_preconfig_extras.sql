-- Preconfig extras for promo items: allows a promotion to define
-- which extras are pre-selected and included in the precio_promo.

CREATE TABLE IF NOT EXISTS public.promocion_item_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promocion_item_id uuid NOT NULL REFERENCES public.promocion_items(id) ON DELETE CASCADE,
  extra_item_carta_id uuid NOT NULL REFERENCES public.items_carta(id),
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_item_extras_promo_item
  ON public.promocion_item_extras(promocion_item_id);

-- RLS
ALTER TABLE public.promocion_item_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_promo_item_extras" ON public.promocion_item_extras
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff_insert_promo_item_extras" ON public.promocion_item_extras
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.local_role IN ('franquiciado', 'encargado')
    )
  );

CREATE POLICY "staff_delete_promo_item_extras" ON public.promocion_item_extras
  FOR DELETE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.local_role IN ('franquiciado', 'encargado')
    )
  );

CREATE POLICY "anon_select_promo_item_extras" ON public.promocion_item_extras
  FOR SELECT TO anon USING (true);
