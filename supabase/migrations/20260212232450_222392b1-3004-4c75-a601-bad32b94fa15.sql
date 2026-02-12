
-- Add preparacion_id to item_removibles
ALTER TABLE public.item_removibles
  ADD COLUMN preparacion_id UUID REFERENCES public.preparaciones(id);

-- Drop the old unique constraint and create a new one
ALTER TABLE public.item_removibles
  DROP CONSTRAINT IF EXISTS item_removibles_item_carta_id_insumo_id_key;

-- Make insumo_id nullable (can be a prep OR insumo)
ALTER TABLE public.item_removibles
  ALTER COLUMN insumo_id DROP NOT NULL;

-- Add check: exactly one of insumo_id or preparacion_id must be set
ALTER TABLE public.item_removibles
  ADD CONSTRAINT item_removibles_one_ref CHECK (
    (insumo_id IS NOT NULL AND preparacion_id IS NULL) OR
    (insumo_id IS NULL AND preparacion_id IS NOT NULL)
  );

-- Unique constraints for each type
CREATE UNIQUE INDEX item_removibles_insumo_unique ON public.item_removibles(item_carta_id, insumo_id) WHERE insumo_id IS NOT NULL;
CREATE UNIQUE INDEX item_removibles_prep_unique ON public.item_removibles(item_carta_id, preparacion_id) WHERE preparacion_id IS NOT NULL;
