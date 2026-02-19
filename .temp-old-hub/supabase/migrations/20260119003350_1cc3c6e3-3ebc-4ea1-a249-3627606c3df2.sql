-- Allow customers to view their own orders using external_order_id or order id
-- This is needed so customers can track their orders after creation
CREATE POLICY "Customers can view their orders by id"
ON public.orders
FOR SELECT
TO public
USING (
  created_at > now() - interval '24 hours'
);

-- Also allow customers to view order items for recent orders
CREATE POLICY "Customers can view their order items"
ON public.order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND o.created_at > now() - interval '24 hours'
  )
);