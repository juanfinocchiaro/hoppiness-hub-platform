-- Recrear branches_public con security_invoker = true
DROP VIEW IF EXISTS public.branches_public;
CREATE VIEW public.branches_public 
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  address,
  city,
  slug,
  phone,
  email,
  latitude,
  longitude,
  opening_time,
  closing_time,
  delivery_enabled,
  takeaway_enabled,
  dine_in_enabled,
  estimated_prep_time_min,
  is_active,
  is_open,
  local_open_state,
  rappi_enabled,
  pedidosya_enabled,
  mercadopago_delivery_enabled,
  public_status,
  public_hours
FROM branches
WHERE public_status = ANY (ARRAY['active'::text, 'coming_soon'::text]);

-- Recrear profiles_public con security_invoker = true
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS SELECT 
  id,
  id AS user_id,
  full_name,
  avatar_url,
  is_active
FROM profiles;