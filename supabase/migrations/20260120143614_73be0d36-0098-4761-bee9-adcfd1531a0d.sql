-- Allow web checkout to insert orders/items for anonymous users (public web)
-- This avoids RLS errors when placing orders without authentication.

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Create policy only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Web checkout can insert orders'
  ) THEN
    CREATE POLICY "Web checkout can insert orders"
    ON public.orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (sales_channel = 'web_app');
  END IF;
END $$;

-- Order items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'Web checkout can insert order items'
  ) THEN
    CREATE POLICY "Web checkout can insert order items"
    ON public.order_items
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.sales_channel = 'web_app'
      )
    );
  END IF;
END $$;