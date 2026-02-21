-- Add columns for credit note linking and cancellation tracking
ALTER TABLE public.facturas_emitidas 
  ADD COLUMN IF NOT EXISTS factura_asociada_id UUID REFERENCES public.facturas_emitidas(id),
  ADD COLUMN IF NOT EXISTS anulada BOOLEAN NOT NULL DEFAULT false;

-- Index for quick lookups of credit notes by original invoice
CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_asociada ON public.facturas_emitidas(factura_asociada_id) WHERE factura_asociada_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.facturas_emitidas.factura_asociada_id IS 'Para Notas de Crédito: referencia a la factura original que se anula';
COMMENT ON COLUMN public.facturas_emitidas.anulada IS 'True si esta factura fue anulada por una Nota de Crédito';