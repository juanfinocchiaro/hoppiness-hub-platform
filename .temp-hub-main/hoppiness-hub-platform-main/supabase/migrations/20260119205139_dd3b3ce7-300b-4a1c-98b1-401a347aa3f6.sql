-- Agregar columna SKU a productos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;