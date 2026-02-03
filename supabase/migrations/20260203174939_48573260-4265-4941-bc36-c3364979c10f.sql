-- Corregir función sin search_path configurado
CREATE OR REPLACE FUNCTION public.update_communications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;