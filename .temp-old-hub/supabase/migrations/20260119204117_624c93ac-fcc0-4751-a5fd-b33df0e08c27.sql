-- Limpiar inventory_count_lines cuando se elimina un producto
ALTER TABLE public.inventory_count_lines
DROP CONSTRAINT IF EXISTS inventory_count_lines_product_id_fkey;

ALTER TABLE public.inventory_count_lines
ADD CONSTRAINT inventory_count_lines_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE SET NULL;