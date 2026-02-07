-- Fix branches_public view to use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.branches_public;

CREATE VIEW public.branches_public
WITH (security_invoker = true)
AS
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

-- Grant SELECT to anon and authenticated for public access
GRANT SELECT ON public.branches_public TO anon, authenticated;