-- Add referencia_app column to pedidos for platform order identifiers
-- (Rappi: 6 digits, MercadoPago: 3 digits, PedidosYa: name)
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS referencia_app VARCHAR(50) DEFAULT NULL;
