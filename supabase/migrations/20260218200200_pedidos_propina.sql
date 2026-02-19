-- Fase 4: Propina en pedidos para POS
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS propina DECIMAL(10,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.pedidos.propina IS 'Propina opcional del cliente (POS)';
