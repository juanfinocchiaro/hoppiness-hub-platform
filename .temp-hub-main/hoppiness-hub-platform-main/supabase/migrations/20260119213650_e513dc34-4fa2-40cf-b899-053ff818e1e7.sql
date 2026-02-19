-- Drop the existing check constraint and add a new one that includes 'combo'
ALTER TABLE public.modifier_groups DROP CONSTRAINT IF EXISTS modifier_groups_modifier_type_check;
ALTER TABLE public.modifier_groups ADD CONSTRAINT modifier_groups_modifier_type_check CHECK (modifier_type IN ('adicional', 'personalizacion', 'combo'));

-- Update the existing "Bebida Combo" group to use the new type
UPDATE public.modifier_groups SET modifier_type = 'combo' WHERE name = 'Bebida Combo';