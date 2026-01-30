-- Actualizar vista branches_public para incluir public_status y public_hours
DROP VIEW IF EXISTS branches_public;

CREATE VIEW branches_public AS
SELECT 
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
WHERE public_status IN ('active', 'coming_soon');