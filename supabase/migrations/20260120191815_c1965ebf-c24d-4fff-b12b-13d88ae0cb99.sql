-- Agregar campo JSONB para datos fiscales
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS fiscal_data JSONB DEFAULT '{}';

-- Agregar latitud y longitud para delivery
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

COMMENT ON COLUMN public.branches.fiscal_data IS 'Datos fiscales: razon_social, cuit, condicion_iva, domicilio_fiscal, inicio_actividades, punto_venta';