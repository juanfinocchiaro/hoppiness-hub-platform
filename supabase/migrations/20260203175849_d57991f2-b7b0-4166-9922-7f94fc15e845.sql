-- La vista branches_public necesita acceso SELECT a la tabla branches para funcionar
-- Pero queremos que solo pueda leer campos limitados a través de la vista

-- Recrear la vista SIN security_invoker para que use los privilegios del definer (más seguro para vistas públicas)
DROP VIEW IF EXISTS public.branches_public;

CREATE VIEW public.branches_public AS
SELECT 
  id,
  name,
  address,
  city,
  slug,
  opening_time,
  closing_time,
  is_active,
  is_open,
  local_open_state,
  public_status,
  public_hours
FROM public.branches
WHERE is_active = true 
  AND (public_status = 'active' OR public_status = 'coming_soon');

-- Dar permisos de SELECT a anon y authenticated sobre la VISTA
GRANT SELECT ON public.branches_public TO anon;
GRANT SELECT ON public.branches_public TO authenticated;