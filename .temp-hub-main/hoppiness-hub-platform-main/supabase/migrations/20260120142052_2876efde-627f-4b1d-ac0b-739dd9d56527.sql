-- Allow anonymous orders from web app (public checkout)
-- Create a policy that allows inserting orders with sales_channel = 'web_app'

CREATE POLICY "Allow public web orders insert" ON public.orders
FOR INSERT
WITH CHECK (sales_channel = 'web_app');

-- Also allow order_items to be inserted for web orders
CREATE POLICY "Allow public order items insert" ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id AND sales_channel = 'web_app'
  )
);