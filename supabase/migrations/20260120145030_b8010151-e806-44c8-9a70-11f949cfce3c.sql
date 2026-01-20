-- Web public checkout: allow INSERT for anon + authenticated with strict checks

-- Orders
DROP POLICY IF EXISTS "Anon can insert web orders" ON public.orders;

CREATE POLICY "Web checkout can insert orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  branch_id IS NOT NULL
  AND status = 'pending'::order_status
  AND sales_channel = 'web_app'::sales_channel
);

-- Order items
DROP POLICY IF EXISTS "Anon can insert web order items" ON public.order_items;

CREATE POLICY "Web checkout can insert order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.sales_channel = 'web_app'::sales_channel
      AND o.status = 'pending'::order_status
  )
);

-- IMPORTANT: remove unsafe public SELECT policy that exposed all recent order_items
DROP POLICY IF EXISTS "Customers can view their order items" ON public.order_items;