-- Asegurar que product_id puede ser NULL
ALTER TABLE public.order_items 
ALTER COLUMN product_id DROP NOT NULL;