-- Traceability for sellable article identity (base vs promo) in order lines.

ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS articulo_id text,
  ADD COLUMN IF NOT EXISTS articulo_tipo text,
  ADD COLUMN IF NOT EXISTS promocion_id uuid REFERENCES public.promociones(id),
  ADD COLUMN IF NOT EXISTS promocion_item_id uuid REFERENCES public.promocion_items(id);

-- Keep values explicit and queryable.
ALTER TABLE public.pedido_items
  DROP CONSTRAINT IF EXISTS pedido_items_articulo_tipo_check;

ALTER TABLE public.pedido_items
  ADD CONSTRAINT pedido_items_articulo_tipo_check
  CHECK (articulo_tipo IS NULL OR articulo_tipo IN ('base', 'promo'));

CREATE INDEX IF NOT EXISTS idx_pedido_items_promocion_id
  ON public.pedido_items(promocion_id);

CREATE INDEX IF NOT EXISTS idx_pedido_items_promocion_item_id
  ON public.pedido_items(promocion_item_id);
