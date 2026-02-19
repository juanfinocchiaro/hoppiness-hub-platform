
-- Tabla de auditoría de ediciones de pago post-venta
CREATE TABLE public.pedido_payment_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  pagos_antes JSONB NOT NULL,
  pagos_despues JSONB NOT NULL,
  motivo TEXT NOT NULL,
  editado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pedido_payment_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment edits for their branches"
  ON public.pedido_payment_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_payment_edits.pedido_id
      AND has_branch_access_v2(auth.uid(), p.branch_id)
    )
  );

CREATE POLICY "Users can create payment edits for their branches"
  ON public.pedido_payment_edits FOR INSERT
  WITH CHECK (
    auth.uid() = editado_por
    AND EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_payment_edits.pedido_id
      AND has_branch_access_v2(auth.uid(), p.branch_id)
    )
  );
