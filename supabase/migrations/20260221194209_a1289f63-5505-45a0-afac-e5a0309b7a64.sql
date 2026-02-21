-- Recreate branches_public view to include cover_image_url
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
  public_hours,
  cover_image_url
FROM public.branches
WHERE is_active = true 
  AND (public_status = 'active' OR public_status = 'coming_soon');

GRANT SELECT ON public.branches_public TO anon;
GRANT SELECT ON public.branches_public TO authenticated;