-- Add Facturante integration fields to branches
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS facturante_api_key TEXT,
ADD COLUMN IF NOT EXISTS facturante_cuit TEXT,
ADD COLUMN IF NOT EXISTS facturante_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS facturante_punto_venta INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.branches.facturante_api_key IS 'API Key de Facturante para esta sucursal';
COMMENT ON COLUMN public.branches.facturante_cuit IS 'CUIT del emisor para facturación';
COMMENT ON COLUMN public.branches.facturante_punto_venta IS 'Punto de venta AFIP';