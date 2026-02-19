-- D2: Add cost_updated_at column to ingredients table
-- This helps track when the cost was last updated for pricing accuracy

ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS cost_updated_at TIMESTAMP WITH TIME ZONE;

-- Create trigger to auto-update cost_updated_at when cost_per_unit changes
CREATE OR REPLACE FUNCTION public.update_ingredient_cost_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit THEN
    NEW.cost_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_ingredient_cost_timestamp ON public.ingredients;

CREATE TRIGGER trigger_update_ingredient_cost_timestamp
BEFORE UPDATE ON public.ingredients
FOR EACH ROW
EXECUTE FUNCTION public.update_ingredient_cost_timestamp();

-- Backfill: set cost_updated_at to updated_at for existing records with cost
UPDATE public.ingredients 
SET cost_updated_at = updated_at 
WHERE cost_per_unit > 0 AND cost_updated_at IS NULL;