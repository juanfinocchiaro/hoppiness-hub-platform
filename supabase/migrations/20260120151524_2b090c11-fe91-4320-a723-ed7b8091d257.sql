-- Drop the existing policy and recreate with explicit role targeting
DROP POLICY IF EXISTS "Web checkout can insert orders" ON public.orders;

-- Create policy that allows both anon AND authenticated users to insert web orders
CREATE POLICY "Web checkout can insert orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  branch_id IS NOT NULL 
  AND status = 'pending'::order_status 
  AND sales_channel = 'web_app'::sales_channel
);