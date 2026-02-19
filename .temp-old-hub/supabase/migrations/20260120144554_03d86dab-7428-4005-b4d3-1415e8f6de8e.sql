-- Ensure web checkout works even if client omits sales_channel
-- Safe default: web_app
ALTER TABLE public.orders
  ALTER COLUMN sales_channel SET DEFAULT 'web_app';