-- Add linked_ingredient_id column to modifier_options for stock tracking
ALTER TABLE public.modifier_options 
ADD COLUMN linked_ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.modifier_options.linked_ingredient_id IS 'Links to an ingredient for stock deduction when this modifier is sold';

-- Create index for faster lookups
CREATE INDEX idx_modifier_options_linked_ingredient ON public.modifier_options(linked_ingredient_id) WHERE linked_ingredient_id IS NOT NULL;