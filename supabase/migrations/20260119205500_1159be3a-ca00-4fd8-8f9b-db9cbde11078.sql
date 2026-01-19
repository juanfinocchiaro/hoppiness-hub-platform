-- Agregar categoría de costo a ingredientes para reportes CMV
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS cost_category TEXT DEFAULT 'alimentos';

-- Agregar tipo de conteo a inventory_counts
ALTER TABLE public.inventory_counts 
ADD COLUMN IF NOT EXISTS count_type TEXT DEFAULT 'weekly' CHECK (count_type IN ('weekly', 'monthly'));

-- Comentar las opciones válidas
COMMENT ON COLUMN public.ingredients.cost_category IS 'Categorías: alimentos, bebidas_alcohol, bebidas_sin_alcohol, descartable_cocina, descartable_delivery, descartable_salon, libreria, limpieza, insumo_clientes, insumo_personal';

-- Crear índice para reportes de CMV por mes
CREATE INDEX IF NOT EXISTS idx_inventory_counts_type_date 
ON public.inventory_counts (branch_id, count_type, count_date);

-- Crear índice para movimientos por fecha (para reporte de compras)
CREATE INDEX IF NOT EXISTS idx_stock_movements_date 
ON public.stock_movements (branch_id, created_at);