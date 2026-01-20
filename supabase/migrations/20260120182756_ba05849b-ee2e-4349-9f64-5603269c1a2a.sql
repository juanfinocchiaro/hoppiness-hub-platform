-- Tabla para registrar cancelaciones de pedidos con información de devoluciones
CREATE TABLE IF NOT EXISTS public.order_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    cancelled_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancel_reason TEXT NOT NULL,
    cancel_notes TEXT,
    refund_amount NUMERIC(12,2),
    refund_method TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_cancellations_order ON public.order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_cancelled_at ON public.order_cancellations(cancelled_at);

-- RLS
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view cancellations" ON public.order_cancellations
    FOR SELECT USING (
        public.is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND public.has_branch_access(auth.uid(), o.branch_id)
        )
    );

CREATE POLICY "Staff can insert cancellations" ON public.order_cancellations
    FOR INSERT WITH CHECK (
        public.is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND public.has_branch_access(auth.uid(), o.branch_id)
        )
    );

-- Agregar columna para historial de movimientos de stock con referencia a factura de proveedor
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS supplier_invoice_id UUID REFERENCES public.supplier_invoices(id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier_invoice ON public.stock_movements(supplier_invoice_id);

-- Agregar realtime a order_cancellations
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_cancellations;