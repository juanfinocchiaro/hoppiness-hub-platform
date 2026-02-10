
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
$$ LANGUAGE plpgsql SET search_path = public;
