ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

COMMENT ON COLUMN public.branches.google_place_id
  IS 'Google Maps Place ID para vincular al perfil de Google My Business';

-- Recreate branches_public view to include google_place_id
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
  cover_image_url,
  latitude,
  longitude,
  google_place_id
FROM public.branches
WHERE is_active = true
  AND (public_status = 'active' OR public_status = 'coming_soon');

GRANT SELECT ON public.branches_public TO anon;
GRANT SELECT ON public.branches_public TO authenticated;
