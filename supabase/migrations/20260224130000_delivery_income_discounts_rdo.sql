-- Add discount fields to pedidos for platform and restaurant discounts
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS descuento_plataforma numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_restaurante numeric DEFAULT 0;

COMMENT ON COLUMN public.pedidos.costo_delivery IS
  'Delivery fee charged to the customer — appears as "Entrega Delivery" income in RDO';
COMMENT ON COLUMN public.pedidos.descuento_plataforma IS
  'Discount applied by the delivery platform (Rappi/PedidosYa/etc.)';
COMMENT ON COLUMN public.pedidos.descuento_restaurante IS
  'Discount applied by the restaurant (own promotions)';

-- Add RDO categories for the new lines if they don't exist
INSERT INTO public.rdo_categories (code, name, section, behavior, display_order, description)
VALUES
  ('ingreso_delivery', 'Entrega Delivery', 'ingresos', 'variable', 2, 'Cargos de envío cobrados a clientes por servicio de delivery'),
  ('descuento_plataforma', 'Descuento Plataforma', 'descuentos', 'variable', 3, 'Descuentos aplicados por plataformas de delivery (Rappi, PedidosYa, etc.)'),
  ('descuento_restaurante', 'Descuento Restaurante', 'descuentos', 'variable', 4, 'Descuentos aplicados por el restaurante (promociones propias)')
ON CONFLICT (code) DO NOTHING;
