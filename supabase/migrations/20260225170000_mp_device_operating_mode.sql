-- Add operating_mode column to mercadopago_config to persist the current mode of the linked Point device.
ALTER TABLE public.mercadopago_config
  ADD COLUMN IF NOT EXISTS device_operating_mode TEXT DEFAULT NULL;
