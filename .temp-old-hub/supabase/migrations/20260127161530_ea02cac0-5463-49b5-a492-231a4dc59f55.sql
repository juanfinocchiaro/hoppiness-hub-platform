
-- Fix function search_path for security
CREATE OR REPLACE FUNCTION update_nucleo_product_mappings_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
