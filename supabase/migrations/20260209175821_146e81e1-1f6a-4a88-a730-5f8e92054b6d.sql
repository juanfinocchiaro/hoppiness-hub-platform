
-- =============================================
-- FASE 2: Nuevos campos en tablas existentes
-- =============================================

-- INSUMOS: tipo_item, rdo_category_code, tracks_stock
ALTER TABLE public.insumos
  ADD COLUMN tipo_item varchar NOT NULL DEFAULT 'insumo' CHECK (tipo_item IN ('ingrediente', 'insumo')),
  ADD COLUMN rdo_category_code text REFERENCES public.rdo_categories(code),
  ADD COLUMN tracks_stock boolean NOT NULL DEFAULT false;

-- GASTOS: rdo_category_code, proveedor_id
ALTER TABLE public.gastos
  ADD COLUMN rdo_category_code text REFERENCES public.rdo_categories(code),
  ADD COLUMN proveedor_id uuid REFERENCES public.proveedores(id);

-- ITEMS_FACTURA: rdo_category_code
ALTER TABLE public.items_factura
  ADD COLUMN rdo_category_code text REFERENCES public.rdo_categories(code);

-- PROVEEDORES: tipo_proveedor, rdo_categories_default
ALTER TABLE public.proveedores
  ADD COLUMN tipo_proveedor text[] DEFAULT '{}',
  ADD COLUMN rdo_categories_default text[] DEFAULT '{}';
