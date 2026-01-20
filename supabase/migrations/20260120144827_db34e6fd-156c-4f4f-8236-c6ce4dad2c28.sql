-- Fix RLS: Change target role to 'anon' for anonymous web orders

-- Drop existing policy
DROP POLICY IF EXISTS "Public can insert web orders" ON public.orders;

-- Create policy explicitly for anon role
CREATE POLICY "Anon can insert web orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (sales_channel = 'web_app');

-- Also fix order_items
DROP POLICY IF EXISTS "Public can insert web order items" ON public.order_items;

CREATE POLICY "Anon can insert web order items"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.sales_channel = 'web_app'
  )
);