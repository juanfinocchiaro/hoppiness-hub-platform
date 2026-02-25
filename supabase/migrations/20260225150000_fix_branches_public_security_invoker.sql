-- Fix: explicitly set security_invoker = false on branches_public view.
-- This project defaults to security_invoker = true for new views, which means
-- the view requires matching RLS policies on the underlying branches table.
-- Since this is a public view exposing only non-sensitive columns, we bypass
-- RLS to avoid recurring breakage every time a migration touches the policies.

DROP VIEW IF EXISTS public.branches_public;

CREATE VIEW public.branches_public
WITH (security_invoker = false)
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
  public_hours,
  cover_image_url,
  latitude,
  longitude,
  google_place_id
FROM public.branches
WHERE is_active = true
  AND (public_status = 'active' OR public_status = 'coming_soon');

GRANT SELECT ON public.branches_public TO anon;
GRANT SELECT ON public.branches_public TO authenticated;
