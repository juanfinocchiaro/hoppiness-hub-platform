-- Allow POS staff to create order items for draft/pending POS orders

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='order_items'
      AND policyname='Staff can create order items'
  ) THEN
    CREATE POLICY "Staff can create order items"
    ON public.order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND public.has_branch_access(auth.uid(), o.branch_id)
          AND o.sales_channel = 'pos_local'::sales_channel
          AND o.status IN ('draft'::order_status, 'pending'::order_status)
      )
    );
  END IF;
END $$;