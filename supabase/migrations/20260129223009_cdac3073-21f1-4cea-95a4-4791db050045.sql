-- Agregar campo para estado público del local en la web
-- Valores: 'active' (operativo), 'coming_soon' (próximamente), 'hidden' (no visible)
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS public_status TEXT DEFAULT 'active';

-- Migrar datos existentes: los que tienen is_active = true pasan a 'active', los demás a 'hidden'
UPDATE public.branches 
SET public_status = CASE 
  WHEN is_active = true THEN 'active'
  ELSE 'hidden'
END
WHERE public_status IS NULL OR public_status = 'active';

-- Actualizar la política RLS para incluir 'coming_soon'
DROP POLICY IF EXISTS "branches_public_read" ON public.branches;
CREATE POLICY "branches_public_read" ON public.branches
  FOR SELECT
  TO anon
  USING (public_status IN ('active', 'coming_soon'));

COMMENT ON COLUMN public.branches.public_status IS 'Estado público: active (operativo), coming_soon (próximamente), hidden (no visible en web)';