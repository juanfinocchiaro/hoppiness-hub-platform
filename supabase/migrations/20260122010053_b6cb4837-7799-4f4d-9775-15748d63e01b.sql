
-- Corregir vista con security_invoker en lugar de security_definer
DROP VIEW IF EXISTS public.branches_public;
CREATE VIEW public.branches_public WITH (security_invoker = true) AS
SELECT id, name, address, city, slug, phone, email, latitude, longitude,
  opening_time, closing_time, delivery_enabled, takeaway_enabled, dine_in_enabled,
  estimated_prep_time_min, is_active, is_open, local_open_state,
  rappi_enabled, pedidosya_enabled, mercadopago_delivery_enabled
FROM public.branches WHERE is_active = true;

GRANT SELECT ON public.branches_public TO anon, authenticated;
