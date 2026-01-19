-- =============================================
-- PLAN B: FULL DATABASE MIGRATION
-- =============================================

-- 1. Add is_enabled_by_brand column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_enabled_by_brand BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.is_enabled_by_brand IS 'Brand-level product enable/disable. If false, product is unavailable across all branches regardless of local availability.';

-- 2. Add is_enabled_by_brand to branch_products for branch-level override visibility
-- (already has is_available for local toggle, this is for brand visibility)
ALTER TABLE public.branch_products 
ADD COLUMN IF NOT EXISTS is_enabled_by_brand BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.branch_products.is_enabled_by_brand IS 'Brand can disable a product specifically for this branch.';

-- 3. Add is_enabled_by_brand to modifier_options for brand-level modifier control
ALTER TABLE public.modifier_options 
ADD COLUMN IF NOT EXISTS is_enabled_by_brand BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.modifier_options.is_enabled_by_brand IS 'Brand-level modifier enable/disable.';

-- 4. Add is_enabled_by_brand to branch_modifier_options
ALTER TABLE public.branch_modifier_options 
ADD COLUMN IF NOT EXISTS is_enabled_by_brand BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.branch_modifier_options.is_enabled_by_brand IS 'Brand can disable a modifier specifically for this branch.';

-- 5. Create order_payments table for split payments
CREATE TABLE IF NOT EXISTS public.order_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID
);

-- Enable RLS on order_payments
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_payments
CREATE POLICY "Staff can view order payments"
  ON public.order_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_payments.order_id 
      AND has_branch_access(auth.uid(), o.branch_id)
    )
  );

CREATE POLICY "Staff can create order payments"
  ON public.order_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_payments.order_id 
      AND has_branch_access(auth.uid(), o.branch_id)
    )
  );

CREATE POLICY "Staff can update order payments"
  ON public.order_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_payments.order_id 
      AND has_branch_permission(auth.uid(), o.branch_id, 'can_manage_orders')
    )
  );

-- 6. Create index for order_payments
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON public.order_payments(order_id);

-- 7. Add admin_force_message to branches for custom brand message
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS admin_force_message TEXT;

COMMENT ON COLUMN public.branches.admin_force_message IS 'Custom message shown when branch is force-closed by brand.';

-- 8. Enable realtime for order_payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_payments;