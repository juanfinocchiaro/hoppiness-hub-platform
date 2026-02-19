-- Combos table (combo products)
CREATE TABLE public.combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Combo items (products included in a combo)
CREATE TABLE public.combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  modifier_group_id UUID REFERENCES public.modifier_groups(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('fixed', 'choice')),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

-- Policies for combos
CREATE POLICY "Combos are viewable by everyone" ON public.combos FOR SELECT USING (true);
CREATE POLICY "Admins can manage combos" ON public.combos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles_v2 WHERE user_id = auth.uid() AND brand_role::text IN ('superadmin', 'coordinador'))
);

-- Policies for combo_items
CREATE POLICY "Combo items are viewable by everyone" ON public.combo_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage combo items" ON public.combo_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles_v2 WHERE user_id = auth.uid() AND brand_role::text IN ('superadmin', 'coordinador'))
);

-- Trigger for updated_at on combos
CREATE TRIGGER update_combos_updated_at BEFORE UPDATE ON public.combos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();