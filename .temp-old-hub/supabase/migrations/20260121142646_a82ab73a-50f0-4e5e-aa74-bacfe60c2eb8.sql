-- Allow POS staff to create draft orders for their branch

-- Ensure RLS is enabled (should already be)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated staff to insert POS orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='orders'
      AND policyname='Staff can create POS orders'
  ) THEN
    CREATE POLICY "Staff can create POS orders"
    ON public.orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_branch_access(auth.uid(), branch_id)
      AND sales_channel = 'pos_local'::sales_channel
      AND status IN ('draft'::order_status, 'pending'::order_status)
    );
  END IF;
END $$;