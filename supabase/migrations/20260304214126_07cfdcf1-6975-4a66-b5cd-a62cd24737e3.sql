
-- =============================================
-- Module 1: cadetes → delivery_drivers
-- =============================================
ALTER TABLE public.cadetes RENAME TO delivery_drivers;
ALTER TABLE public.delivery_drivers RENAME COLUMN nombre TO name;
ALTER TABLE public.delivery_drivers RENAME COLUMN telefono TO phone;
ALTER TABLE public.delivery_drivers RENAME COLUMN pedidos_hoy TO orders_today;

-- =============================================
-- Module 2: canales_venta → sales_channels
-- =============================================
ALTER TABLE public.canales_venta RENAME TO sales_channels;
ALTER TABLE public.sales_channels RENAME COLUMN codigo TO code;
ALTER TABLE public.sales_channels RENAME COLUMN nombre TO name;
ALTER TABLE public.sales_channels RENAME COLUMN orden TO sort_order;
ALTER TABLE public.sales_channels RENAME COLUMN tipo_ajuste TO adjustment_type;
ALTER TABLE public.sales_channels RENAME COLUMN ajuste_valor TO adjustment_value;

-- =============================================
-- Module 3: llamadores → pagers
-- =============================================
ALTER TABLE public.llamadores RENAME TO pagers;
ALTER TABLE public.pagers RENAME COLUMN numero TO number;
ALTER TABLE public.pagers RENAME COLUMN asignado_at TO assigned_at;
ALTER TABLE public.pagers RENAME COLUMN pedido_id TO order_id;
