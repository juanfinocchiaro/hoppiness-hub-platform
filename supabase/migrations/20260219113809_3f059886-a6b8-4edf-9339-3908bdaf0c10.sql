-- Add precio_referencia column to items_carta
-- This is the "reference price" (what the product would cost without promotion)
-- When precio_referencia > precio_base, the system understands there's a discount
ALTER TABLE public.items_carta
ADD COLUMN precio_referencia NUMERIC(12,2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.items_carta.precio_referencia IS 'Precio sin promoción. Si es mayor que precio_base, el POS muestra descuento y el RDO lo registra como gasto de comercialización.';