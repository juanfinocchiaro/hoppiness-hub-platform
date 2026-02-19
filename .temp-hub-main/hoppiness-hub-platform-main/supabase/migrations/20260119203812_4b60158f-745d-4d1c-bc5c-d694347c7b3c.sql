-- Agregar columna para snapshot del nombre del producto
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT;

-- Crear función que captura el nombre del producto al insertar
CREATE OR REPLACE FUNCTION public.capture_product_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Si no se proporcionó snapshot, obtenerlo del producto
    IF NEW.product_name_snapshot IS NULL THEN
        SELECT name INTO NEW.product_name_snapshot
        FROM public.products
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear trigger para capturar automáticamente
DROP TRIGGER IF EXISTS capture_product_snapshot_trigger ON public.order_items;
CREATE TRIGGER capture_product_snapshot_trigger
    BEFORE INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.capture_product_snapshot();

-- Backfill: llenar datos históricos existentes
UPDATE public.order_items oi
SET product_name_snapshot = p.name
FROM public.products p
WHERE oi.product_id = p.id
AND oi.product_name_snapshot IS NULL;