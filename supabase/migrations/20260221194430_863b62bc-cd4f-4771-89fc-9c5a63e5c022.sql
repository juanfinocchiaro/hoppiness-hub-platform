-- Add cliente_user_id to pedidos to link orders to user accounts
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS cliente_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_user 
  ON public.pedidos(cliente_user_id) 
  WHERE cliente_user_id IS NOT NULL;

-- Allow authenticated users to read their own orders
CREATE POLICY "Clients can view their own orders" 
  ON public.pedidos 
  FOR SELECT 
  USING (auth.uid() = cliente_user_id);