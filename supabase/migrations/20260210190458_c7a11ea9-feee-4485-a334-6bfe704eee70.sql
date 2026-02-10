
-- =====================================================
-- Sistema de Unidades Dual para Ingredientes/Insumos
-- =====================================================

-- 1. Agregar columnas nuevas a insumos
ALTER TABLE public.insumos 
ADD COLUMN IF NOT EXISTS unidad_compra VARCHAR(20) DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS unidad_compra_contenido DECIMAL(12,4),
ADD COLUMN IF NOT EXISTS unidad_compra_precio DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS costo_por_unidad_base DECIMAL(12,4);

-- 2. Comentarios descriptivos
COMMENT ON COLUMN public.insumos.unidad_base IS 'Unidad para recetas: g, ml, un';
COMMENT ON COLUMN public.insumos.unidad_compra IS 'Presentación de compra: kg, pote, balde, caja, bolsa, etc';
COMMENT ON COLUMN public.insumos.unidad_compra_contenido IS 'Cantidad de unidad_base en cada unidad_compra';
COMMENT ON COLUMN public.insumos.unidad_compra_precio IS 'Precio de la presentación de compra';
COMMENT ON COLUMN public.insumos.costo_por_unidad_base IS 'Precio calculado por unidad base (precio/contenido)';

-- 3. Función para calcular costo por unidad base
CREATE OR REPLACE FUNCTION public.calcular_costo_unidad_base()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unidad_compra_contenido > 0 AND NEW.unidad_compra_precio IS NOT NULL THEN
    NEW.costo_por_unidad_base := NEW.unidad_compra_precio / NEW.unidad_compra_contenido;
  ELSE
    NEW.costo_por_unidad_base := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para calcular automáticamente
DROP TRIGGER IF EXISTS trg_calcular_costo_unidad_base ON public.insumos;
CREATE TRIGGER trg_calcular_costo_unidad_base
  BEFORE INSERT OR UPDATE OF unidad_compra_contenido, unidad_compra_precio
  ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_costo_unidad_base();

-- 5. Migrar datos existentes (precio_referencia → nuevo sistema)
UPDATE public.insumos 
SET 
  unidad_compra = CASE 
    WHEN unidad_base IN ('kg', 'g') THEN 'kg'
    WHEN unidad_base IN ('lt', 'ml') THEN 'litro'
    ELSE 'unidad'
  END,
  unidad_compra_contenido = CASE
    WHEN unidad_base = 'kg' THEN 1
    WHEN unidad_base = 'g' THEN 1000
    WHEN unidad_base = 'lt' THEN 1
    WHEN unidad_base = 'ml' THEN 1000
    ELSE 1
  END,
  unidad_compra_precio = CASE
    WHEN unidad_base IN ('kg', 'lt', 'un') THEN precio_referencia
    WHEN unidad_base = 'g' THEN precio_referencia * 1000
    WHEN unidad_base = 'ml' THEN precio_referencia * 1000
    ELSE precio_referencia
  END
WHERE precio_referencia IS NOT NULL 
  AND unidad_compra_contenido IS NULL;
