
-- ============================================
-- PARTE 2: Detalle fiscal en facturas_proveedores
-- ============================================

-- Nuevas columnas de impuestos en facturas_proveedores
ALTER TABLE public.facturas_proveedores
  ADD COLUMN IF NOT EXISTS subtotal_bruto DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS total_descuentos DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_neto DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS imp_internos DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_21 DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_105 DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perc_iva DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perc_provincial DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perc_municipal DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_factura DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS costo_real DECIMAL(12,2);

-- Nuevas columnas en items_factura para precio bruto y descuentos
ALTER TABLE public.items_factura
  ADD COLUMN IF NOT EXISTS precio_bruto DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_monto DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_neto DECIMAL(12,2);

-- Trigger para calcular costo_real automáticamente
-- costo_real = subtotal_neto + imp_internos + perc_provincial + perc_municipal
-- (excluye IVA y perc_iva que son crédito fiscal recuperable)
CREATE OR REPLACE FUNCTION public.calcular_costo_real_factura()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.costo_real := COALESCE(NEW.subtotal_neto, NEW.subtotal, 0)
    + COALESCE(NEW.imp_internos, 0)
    + COALESCE(NEW.perc_provincial, 0)
    + COALESCE(NEW.perc_municipal, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_costo_real ON public.facturas_proveedores;
CREATE TRIGGER trg_calcular_costo_real
  BEFORE INSERT OR UPDATE ON public.facturas_proveedores
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_costo_real_factura();
