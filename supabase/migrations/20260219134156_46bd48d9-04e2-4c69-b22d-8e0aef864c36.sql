
-- 1. Nueva tabla stock_conteos
CREATE TABLE public.stock_conteos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  periodo text,
  nota_general text,
  resumen jsonb,
  status text NOT NULL DEFAULT 'borrador',
  created_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Nueva tabla stock_conteo_items
CREATE TABLE public.stock_conteo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conteo_id uuid NOT NULL REFERENCES public.stock_conteos(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  stock_teorico numeric NOT NULL DEFAULT 0,
  stock_real numeric,
  diferencia numeric GENERATED ALWAYS AS (COALESCE(stock_real, 0) - stock_teorico) STORED,
  costo_unitario numeric NOT NULL DEFAULT 0,
  valor_diferencia numeric GENERATED ALWAYS AS ((COALESCE(stock_real, 0) - stock_teorico) * costo_unitario) STORED
);

-- 3. Agregar campos a stock_actual
ALTER TABLE public.stock_actual ADD COLUMN IF NOT EXISTS stock_minimo_local numeric;
ALTER TABLE public.stock_actual ADD COLUMN IF NOT EXISTS stock_critico_local numeric;

-- 4. Agregar nota a stock_movimientos
ALTER TABLE public.stock_movimientos ADD COLUMN IF NOT EXISTS nota text;

-- 5. RLS para stock_conteos
ALTER TABLE public.stock_conteos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with branch access can view stock_conteos"
  ON public.stock_conteos FOR SELECT
  USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Users with branch access can insert stock_conteos"
  ON public.stock_conteos FOR INSERT
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Users with branch access can update stock_conteos"
  ON public.stock_conteos FOR UPDATE
  USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Users with branch access can delete stock_conteos"
  ON public.stock_conteos FOR DELETE
  USING (public.has_branch_access_v2(auth.uid(), branch_id));

-- 6. RLS para stock_conteo_items
ALTER TABLE public.stock_conteo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage conteo items via conteo access"
  ON public.stock_conteo_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_conteos sc
      WHERE sc.id = conteo_id
      AND public.has_branch_access_v2(auth.uid(), sc.branch_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stock_conteos sc
      WHERE sc.id = conteo_id
      AND public.has_branch_access_v2(auth.uid(), sc.branch_id)
    )
  );

-- 7. Index for performance
CREATE INDEX idx_stock_conteos_branch_fecha ON public.stock_conteos(branch_id, fecha);
CREATE INDEX idx_stock_conteo_items_conteo ON public.stock_conteo_items(conteo_id);
