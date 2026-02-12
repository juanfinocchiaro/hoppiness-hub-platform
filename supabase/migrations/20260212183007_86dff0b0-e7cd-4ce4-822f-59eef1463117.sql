
-- Fix FK: item_modificadores should reference items_carta, not menu_productos
ALTER TABLE public.item_modificadores
  DROP CONSTRAINT item_modificadores_item_carta_id_fkey;

ALTER TABLE public.item_modificadores
  ADD CONSTRAINT item_modificadores_item_carta_id_fkey
  FOREIGN KEY (item_carta_id) REFERENCES public.items_carta(id) ON DELETE CASCADE;
