-- =============================================
-- LIMPIEZA: Eliminar campos de POS/Integraciones no usadas
-- =============================================

-- 1. PRIMERO eliminar vista que depende de las columnas
DROP VIEW IF EXISTS public.branches_public CASCADE;

-- 2. Eliminar función get_branch_sensitive_data
DROP FUNCTION IF EXISTS public.get_branch_sensitive_data(uuid);

-- 3. Eliminar campos de MercadoPago
ALTER TABLE public.branches DROP COLUMN IF EXISTS mercadopago_access_token;
ALTER TABLE public.branches DROP COLUMN IF EXISTS mercadopago_public_key;
ALTER TABLE public.branches DROP COLUMN IF EXISTS mercadopago_delivery_enabled;
ALTER TABLE public.branches DROP COLUMN IF EXISTS mp_delivery_store_id;

-- 4. Eliminar campos de Rappi
ALTER TABLE public.branches DROP COLUMN IF EXISTS rappi_api_key;
ALTER TABLE public.branches DROP COLUMN IF EXISTS rappi_enabled;
ALTER TABLE public.branches DROP COLUMN IF EXISTS rappi_store_id;

-- 5. Eliminar campos de PedidosYa
ALTER TABLE public.branches DROP COLUMN IF EXISTS pedidosya_api_key;
ALTER TABLE public.branches DROP COLUMN IF EXISTS pedidosya_enabled;
ALTER TABLE public.branches DROP COLUMN IF EXISTS pedidosya_restaurant_id;

-- 6. Eliminar campos de Facturante
ALTER TABLE public.branches DROP COLUMN IF EXISTS facturante_api_key;
ALTER TABLE public.branches DROP COLUMN IF EXISTS facturante_cuit;
ALTER TABLE public.branches DROP COLUMN IF EXISTS facturante_enabled;
ALTER TABLE public.branches DROP COLUMN IF EXISTS facturante_punto_venta;

-- 7. Eliminar campos de facturación
ALTER TABLE public.branches DROP COLUMN IF EXISTS invoice_provider;
ALTER TABLE public.branches DROP COLUMN IF EXISTS auto_invoice_integrations;
ALTER TABLE public.branches DROP COLUMN IF EXISTS fiscal_data;

-- 8. Eliminar campos de POS/Cocina
ALTER TABLE public.branches DROP COLUMN IF EXISTS kitchen_type;
ALTER TABLE public.branches DROP COLUMN IF EXISTS estimated_prep_time_min;

-- 9. Eliminar campos de canales de venta
ALTER TABLE public.branches DROP COLUMN IF EXISTS delivery_enabled;
ALTER TABLE public.branches DROP COLUMN IF EXISTS takeaway_enabled;
ALTER TABLE public.branches DROP COLUMN IF EXISTS dine_in_enabled;

-- 10. Eliminar otros campos
ALTER TABLE public.branches DROP COLUMN IF EXISTS webhook_api_key;
ALTER TABLE public.branches DROP COLUMN IF EXISTS allowed_ips;

-- 11. Recrear vista branches_public simplificada
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
  is_active,
  is_open,
  local_open_state,
  public_status,
  public_hours,
  clock_code
FROM branches
WHERE public_status = ANY (ARRAY['active'::text, 'coming_soon'::text]);