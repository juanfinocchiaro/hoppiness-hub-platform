-- Create ingredient unit conversions table
CREATE TABLE public.ingredient_unit_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  from_unit text NOT NULL,
  to_unit text NOT NULL,
  conversion_factor numeric NOT NULL DEFAULT 1,
  is_purchase_to_usage boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ingredient_id, from_unit, to_unit)
);

-- Enable RLS
ALTER TABLE public.ingredient_unit_conversions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read conversions"
ON public.ingredient_unit_conversions FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage conversions"
ON public.ingredient_unit_conversions FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

-- Add comments
COMMENT ON TABLE public.ingredient_unit_conversions IS 'Unit conversion factors per ingredient (e.g., 1 caja = 24 unidades)';
COMMENT ON COLUMN public.ingredient_unit_conversions.conversion_factor IS 'How many to_unit equals 1 from_unit';
COMMENT ON COLUMN public.ingredient_unit_conversions.is_purchase_to_usage IS 'True if this is the main purchase-to-usage conversion';