-- Add purchase/usage unit fields and dynamic stock calculation columns
ALTER TABLE public.ingredients
ADD COLUMN IF NOT EXISTS purchase_unit text,
ADD COLUMN IF NOT EXISTS purchase_unit_qty numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS usage_unit text,
ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS safety_stock_days integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS avg_daily_consumption numeric DEFAULT 0;

-- Update existing rows: set usage_unit from current unit, purchase_unit defaults to same
UPDATE public.ingredients
SET usage_unit = unit,
    purchase_unit = unit
WHERE usage_unit IS NULL;

-- Add comment explaining the dynamic min_stock calculation
COMMENT ON COLUMN public.ingredients.avg_daily_consumption IS 'Calculated from sales history. min_stock = avg_daily_consumption * (lead_time_days + safety_stock_days)';
COMMENT ON COLUMN public.ingredients.lead_time_days IS 'Days from order to delivery from supplier';
COMMENT ON COLUMN public.ingredients.safety_stock_days IS 'Extra buffer days of stock';
COMMENT ON COLUMN public.ingredients.purchase_unit IS 'Unit when buying (e.g., "caja", "bolsa")';
COMMENT ON COLUMN public.ingredients.purchase_unit_qty IS 'How many usage_units per purchase_unit';
COMMENT ON COLUMN public.ingredients.usage_unit IS 'Unit for recipes/consumption (e.g., "kg", "unidad")';