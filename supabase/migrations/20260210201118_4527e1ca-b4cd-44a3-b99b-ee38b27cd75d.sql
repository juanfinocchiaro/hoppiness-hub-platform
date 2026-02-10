
-- Add product fields to insumos table
ALTER TABLE public.insumos
ADD COLUMN IF NOT EXISTS precio_venta DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS margen_bruto DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS margen_porcentaje DECIMAL(5,2);

COMMENT ON COLUMN public.insumos.precio_venta IS 'Precio de venta al público (solo para tipo_item = producto)';
COMMENT ON COLUMN public.insumos.margen_bruto IS 'Calculado: precio_venta - costo_por_unidad_base';
COMMENT ON COLUMN public.insumos.margen_porcentaje IS 'Calculado: (margen_bruto / precio_venta) * 100';

-- Trigger to auto-calculate margin
CREATE OR REPLACE FUNCTION public.calcular_margen_producto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_item = 'producto' AND NEW.precio_venta IS NOT NULL AND NEW.precio_venta > 0 THEN
    NEW.margen_bruto := NEW.precio_venta - COALESCE(NEW.costo_por_unidad_base, 0);
    IF NEW.precio_venta > 0 THEN
      NEW.margen_porcentaje := (NEW.margen_bruto / NEW.precio_venta) * 100;
    END IF;
  ELSE
    NEW.margen_bruto := NULL;
    NEW.margen_porcentaje := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_calcular_margen ON public.insumos;
CREATE TRIGGER trg_calcular_margen
  BEFORE INSERT OR UPDATE OF tipo_item, precio_venta, costo_por_unidad_base
  ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_margen_producto();
