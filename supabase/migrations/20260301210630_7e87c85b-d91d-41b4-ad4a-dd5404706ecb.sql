-- Fix: Change branches_public view from SECURITY DEFINER to SECURITY INVOKER
-- This ensures the view respects the querying user's RLS policies
CREATE OR REPLACE VIEW public.branches_public
WITH (security_invoker = true)
AS
SELECT id,
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
FROM branches
WHERE is_active = true 
  AND (public_status = 'active' OR public_status = 'coming_soon');