-- Agregar campo para vincular opciones de modificadores con productos existentes
ALTER TABLE public.modifier_options 
ADD COLUMN IF NOT EXISTS linked_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Agregar índice para consultas
CREATE INDEX IF NOT EXISTS idx_modifier_options_linked_product 
ON public.modifier_options (linked_product_id) WHERE linked_product_id IS NOT NULL;

-- Agregar comentario explicativo
COMMENT ON COLUMN public.modifier_options.linked_product_id IS 'Vincula esta opción con un producto existente para heredar imagen/nombre y trackear estadísticas unificadas';

-- Agregar campo para indicar origen de venta en order_item_modifiers (carta vs combo)
ALTER TABLE public.order_item_modifiers
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'modifier' CHECK (source_type IN ('modifier', 'direct'));