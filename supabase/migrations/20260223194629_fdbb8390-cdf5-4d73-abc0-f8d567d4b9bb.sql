
-- ============================================================
-- PARTE 1B: Migrar delivery a asignación exclusiva
-- ============================================================

-- 1. Vaciar tabla actual
DELETE FROM branch_delivery_neighborhoods;

-- 2. Eliminar FK y columna conflict_with_branch_id
ALTER TABLE branch_delivery_neighborhoods
  DROP CONSTRAINT IF EXISTS branch_delivery_neighborhoods_conflict_with_branch_id_fkey;
ALTER TABLE branch_delivery_neighborhoods
  DROP COLUMN IF EXISTS conflict_with_branch_id;

-- 3. Cambiar default de status a 'assigned'
ALTER TABLE branch_delivery_neighborhoods
  ALTER COLUMN status SET DEFAULT 'assigned';

-- 4. Crear índice único: un barrio solo puede estar 'assigned' a un local
CREATE UNIQUE INDEX uq_neighborhood_assigned
  ON branch_delivery_neighborhoods (neighborhood_id)
  WHERE status = 'assigned';

-- ============================================================
-- PARTE 1C: Columnas de delivery en pedidos
-- ============================================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_neighborhood TEXT;

-- ============================================================
-- PARTE 1D: Tabla branch_item_availability
-- ============================================================

CREATE TABLE IF NOT EXISTS public.branch_item_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  item_carta_id UUID NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  available BOOLEAN NOT NULL DEFAULT true,
  available_webapp BOOLEAN NOT NULL DEFAULT true,
  available_salon BOOLEAN NOT NULL DEFAULT true,
  out_of_stock BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, item_carta_id)
);

-- RLS
ALTER TABLE public.branch_item_availability ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "branch_item_availability_select"
  ON public.branch_item_availability FOR SELECT
  USING (true);

-- Insert/Delete para admins de marca
CREATE POLICY "branch_item_availability_insert"
  ON public.branch_item_availability FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "branch_item_availability_delete"
  ON public.branch_item_availability FOR DELETE
  USING (is_superadmin(auth.uid()));

-- Update para staff del local
CREATE POLICY "branch_item_availability_update"
  ON public.branch_item_availability FOR UPDATE
  USING (
    is_superadmin(auth.uid())
    OR has_branch_access_v2(auth.uid(), branch_id)
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_branch_item_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_branch_item_availability_updated_at
  BEFORE UPDATE ON public.branch_item_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_branch_item_availability_updated_at();

-- Seed inicial: una fila por cada combinación branch × item activo
INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
SELECT b.id, ic.id
FROM branches b
CROSS JOIN items_carta ic
WHERE b.is_active = true
  AND ic.activo = true
  AND ic.deleted_at IS NULL
ON CONFLICT (branch_id, item_carta_id) DO NOTHING;
