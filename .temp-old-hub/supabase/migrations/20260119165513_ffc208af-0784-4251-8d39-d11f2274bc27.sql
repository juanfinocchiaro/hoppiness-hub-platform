-- Add integration credentials columns to branches table for each local to configure their own integrations
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS mercadopago_access_token text,
ADD COLUMN IF NOT EXISTS mercadopago_public_key text,
ADD COLUMN IF NOT EXISTS rappi_store_id text,
ADD COLUMN IF NOT EXISTS rappi_api_key text,
ADD COLUMN IF NOT EXISTS pedidosya_restaurant_id text,
ADD COLUMN IF NOT EXISTS pedidosya_api_key text,
ADD COLUMN IF NOT EXISTS mp_delivery_store_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.branches.mercadopago_access_token IS 'MercadoPago access token for this branch';
COMMENT ON COLUMN public.branches.mercadopago_public_key IS 'MercadoPago public key for this branch';
COMMENT ON COLUMN public.branches.rappi_store_id IS 'Rappi store ID for this branch';
COMMENT ON COLUMN public.branches.rappi_api_key IS 'Rappi API key for this branch';
COMMENT ON COLUMN public.branches.pedidosya_restaurant_id IS 'PedidosYa restaurant ID for this branch';
COMMENT ON COLUMN public.branches.pedidosya_api_key IS 'PedidosYa API key for this branch';
COMMENT ON COLUMN public.branches.mp_delivery_store_id IS 'MercadoPago Delivery store ID for this branch';