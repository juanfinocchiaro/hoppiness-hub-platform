-- Agregar nuevos valores al enum sales_channel para soportar web_app y pos_local
ALTER TYPE public.sales_channel ADD VALUE IF NOT EXISTS 'web_app';
ALTER TYPE public.sales_channel ADD VALUE IF NOT EXISTS 'pos_local';

-- Agregar columna external_order_id a orders para integraciones
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_order_id text;