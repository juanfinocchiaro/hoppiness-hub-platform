-- Fix RLS policies for web checkout - drop conflicting policies and create clean ones

-- Drop potentially conflicting INSERT policies on orders
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public web orders insert" ON public.orders;
DROP POLICY IF EXISTS "Web checkout can insert orders" ON public.orders;

-- Create a single clean INSERT policy for web orders
CREATE POLICY "Public can insert web orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (sales_channel = 'web_app');

-- Drop potentially conflicting INSERT policies on order_items
DROP POLICY IF EXISTS "Items can be added to orders" ON public.order_items;
DROP POLICY IF EXISTS "Allow public order items insert" ON public.order_items;
DROP POLICY IF EXISTS "Web checkout can insert order items" ON public.order_items;

-- Create a single clean INSERT policy for order items from web orders
CREATE POLICY "Public can insert web order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.sales_channel = 'web_app'
  )
);