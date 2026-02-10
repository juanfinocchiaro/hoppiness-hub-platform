
-- Add IVA columns to items_factura
ALTER TABLE public.items_factura
  ADD COLUMN IF NOT EXISTS alicuota_iva NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS iva_monto NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS precio_unitario_bruto NUMERIC(12,2);

-- Add comments for clarity
COMMENT ON COLUMN public.items_factura.alicuota_iva IS 'IVA rate: 21, 10.5, 27, 0 (exento), NULL (sin factura)';
COMMENT ON COLUMN public.items_factura.iva_monto IS 'Calculated: precio_unitario * (alicuota_iva / 100)';
COMMENT ON COLUMN public.items_factura.precio_unitario_bruto IS 'Calculated: precio_unitario + iva_monto';
