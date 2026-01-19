
-- Tabla para asignar opciones individuales a productos
CREATE TABLE public.product_modifier_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  modifier_option_id UUID NOT NULL REFERENCES public.modifier_options(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, modifier_option_id)
);

-- Indices para performance
CREATE INDEX idx_product_modifier_options_product ON public.product_modifier_options(product_id);
CREATE INDEX idx_product_modifier_options_option ON public.product_modifier_options(modifier_option_id);

-- RLS
ALTER TABLE public.product_modifier_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product_modifier_options"
  ON public.product_modifier_options FOR SELECT
  USING (true);

CREATE POLICY "Admins manage product_modifier_options"
  ON public.product_modifier_options FOR ALL
  USING (public.is_admin(auth.uid()));

-- Agregar columna modifier_type a modifier_groups para distinguir adicionales vs personalizaciones
ALTER TABLE public.modifier_groups ADD COLUMN modifier_type TEXT NOT NULL DEFAULT 'adicional' 
  CHECK (modifier_type IN ('adicional', 'personalizacion'));

-- Actualizar grupos existentes
UPDATE public.modifier_groups SET modifier_type = 'personalizacion' WHERE name = 'Sin ingredientes';
UPDATE public.modifier_groups SET modifier_type = 'personalizacion' WHERE name = 'Cocción';

-- Renombrar grupos para simplificar
UPDATE public.modifier_groups SET name = 'Adicionales' WHERE name IN ('Sumale Bacon', 'Sumale Básicos', 'Sumale Especiales', 'Sumale Vegetales');

-- Eliminar grupos duplicados, mover opciones al grupo principal "Adicionales"
DO $$
DECLARE
  v_main_group_id UUID;
  v_groups_to_merge UUID[];
BEGIN
  -- Obtener el primer grupo "Adicionales" como principal
  SELECT id INTO v_main_group_id FROM modifier_groups WHERE name = 'Adicionales' ORDER BY created_at LIMIT 1;
  
  -- Obtener los otros grupos "Adicionales" para fusionar
  SELECT ARRAY_AGG(id) INTO v_groups_to_merge FROM modifier_groups 
  WHERE name = 'Adicionales' AND id != v_main_group_id;
  
  IF v_groups_to_merge IS NOT NULL THEN
    -- Mover opciones al grupo principal
    UPDATE modifier_options SET group_id = v_main_group_id 
    WHERE group_id = ANY(v_groups_to_merge);
    
    -- Eliminar grupos vacíos
    DELETE FROM modifier_groups WHERE id = ANY(v_groups_to_merge);
  END IF;
END $$;

-- Renombrar "Sin ingredientes" a "Personalizaciones"
UPDATE public.modifier_groups SET name = 'Personalizaciones' WHERE name = 'Sin ingredientes';
