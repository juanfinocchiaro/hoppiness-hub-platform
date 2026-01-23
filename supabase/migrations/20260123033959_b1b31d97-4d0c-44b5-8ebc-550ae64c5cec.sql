-- Add intelligent purchasing fields to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS order_days integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS delivery_days integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lead_time_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS preferred_order_time time DEFAULT '10:00:00';

-- Create ingredient_suppliers junction table for assigning ingredients to suppliers
CREATE TABLE IF NOT EXISTS public.ingredient_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  price_per_unit NUMERIC(12,2),
  min_order_quantity NUMERIC(10,2) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ingredient_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.ingredient_suppliers ENABLE ROW LEVEL SECURITY;

-- Policies for ingredient_suppliers
CREATE POLICY "ingredient_suppliers_read_all" ON public.ingredient_suppliers
FOR SELECT USING (true);

CREATE POLICY "ingredient_suppliers_modify_authenticated" ON public.ingredient_suppliers
FOR ALL USING (auth.role() = 'authenticated');

-- Add comments for clarity
COMMENT ON COLUMN public.suppliers.order_days IS 'Days of week when orders can be placed (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.suppliers.delivery_days IS 'Days of week when supplier delivers (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.suppliers.lead_time_hours IS 'Hours in advance required for orders';
COMMENT ON COLUMN public.suppliers.preferred_order_time IS 'Best time to place orders';