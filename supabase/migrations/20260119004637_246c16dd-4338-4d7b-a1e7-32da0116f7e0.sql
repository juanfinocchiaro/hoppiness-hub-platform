-- Agregar columnas para canales de venta en branches
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS takeaway_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS dine_in_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rappi_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pedidosya_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mercadopago_delivery_enabled boolean DEFAULT false;