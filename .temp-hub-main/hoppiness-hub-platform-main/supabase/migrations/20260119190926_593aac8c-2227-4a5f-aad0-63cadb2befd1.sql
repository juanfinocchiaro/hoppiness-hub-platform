-- Add 'draft' status to order_status enum for orders being built (not sent to kitchen yet)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';

-- Add columns for tracking partial payments on orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.orders.amount_paid IS 'Total amount paid so far (sum of order_payments)';
COMMENT ON COLUMN public.orders.is_finalized IS 'True when order is closed and sent to kitchen';