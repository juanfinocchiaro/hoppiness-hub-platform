-- Add precio_referencia to pedido_items to track promo discounts per item
ALTER TABLE public.pedido_items
ADD COLUMN precio_referencia NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN public.pedido_items.precio_referencia IS 'Precio sin promoción vigente al momento de la venta. Permite calcular descuento_promo = (precio_referencia - precio_unitario) * cantidad para el RDO.';