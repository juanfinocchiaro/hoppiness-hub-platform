-- MercadoPago Point Smart integration + pendiente_pago state
-- Allows orders to wait for payment confirmation before appearing in kitchen

-- 1. Add 'pendiente_pago' and 'confirmado' to pedidos.estado CHECK constraint
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN (
    'pendiente_pago', 'pendiente', 'confirmado',
    'en_preparacion', 'listo', 'listo_retiro', 'listo_mesa', 'listo_envio',
    'en_camino', 'entregado', 'cancelado'
  ));

-- 2. Point Smart device config
ALTER TABLE mercadopago_config
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS device_name TEXT;

-- 3. Track payment intent on pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS mp_payment_intent_id TEXT;

-- 4. Reconciliation fields on pedido_pagos
ALTER TABLE pedido_pagos
  ADD COLUMN IF NOT EXISTS conciliado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conciliado_at TIMESTAMPTZ;
