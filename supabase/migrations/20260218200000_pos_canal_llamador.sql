-- Canal de venta y tipo de servicio para POS (Fase 1)
-- pedidos ya tiene numero_llamador; agregamos canal_venta, tipo_servicio, canal_app

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS canal_venta VARCHAR(20) DEFAULT 'mostrador' CHECK (canal_venta IN ('mostrador', 'apps')),
  ADD COLUMN IF NOT EXISTS tipo_servicio VARCHAR(20) CHECK (tipo_servicio IN ('takeaway', 'comer_aca', 'delivery')),
  ADD COLUMN IF NOT EXISTS canal_app VARCHAR(20) CHECK (canal_app IN ('rappi', 'pedidos_ya', 'mp_delivery'));

COMMENT ON COLUMN public.pedidos.canal_venta IS 'Origen del pedido: mostrador o apps de delivery';
COMMENT ON COLUMN public.pedidos.tipo_servicio IS 'Para mostrador: takeaway, comer_aca, delivery';
COMMENT ON COLUMN public.pedidos.canal_app IS 'Cuando canal_venta=apps: rappi, pedidos_ya, mp_delivery';
