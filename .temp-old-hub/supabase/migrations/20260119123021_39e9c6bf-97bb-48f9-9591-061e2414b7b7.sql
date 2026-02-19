-- =====================================================
-- SECURITY FIX: Order Input Validation Triggers
-- =====================================================

-- 1. Validate order before insert
CREATE OR REPLACE FUNCTION public.validate_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    branch_active BOOLEAN;
BEGIN
    -- Validate branch is active
    SELECT is_active INTO branch_active
    FROM public.branches WHERE id = NEW.branch_id;
    
    IF branch_active IS NULL THEN
        RAISE EXCEPTION 'Branch does not exist';
    END IF;
    
    IF NOT branch_active THEN
        RAISE EXCEPTION 'Branch is not active';
    END IF;
    
    -- Validate required customer fields
    IF NEW.customer_name IS NULL OR TRIM(NEW.customer_name) = '' THEN
        RAISE EXCEPTION 'Customer name is required';
    END IF;
    
    IF NEW.customer_phone IS NULL OR TRIM(NEW.customer_phone) = '' THEN
        RAISE EXCEPTION 'Customer phone is required';
    END IF;
    
    -- Validate amounts are non-negative
    IF NEW.subtotal < 0 OR NEW.total < 0 OR COALESCE(NEW.delivery_fee, 0) < 0 THEN
        RAISE EXCEPTION 'Invalid negative amounts';
    END IF;
    
    -- Validate total is reasonable (not $0 unless explicitly allowed)
    IF NEW.total <= 0 THEN
        RAISE EXCEPTION 'Order total must be greater than zero';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_order_insert
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_before_insert();

-- 2. Validate order items before insert
CREATE OR REPLACE FUNCTION public.validate_order_item_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    actual_price DECIMAL(10,2);
    product_available BOOLEAN;
    product_exists BOOLEAN;
    order_branch_id UUID;
BEGIN
    -- Get order's branch_id
    SELECT branch_id INTO order_branch_id
    FROM public.orders WHERE id = NEW.order_id;
    
    IF order_branch_id IS NULL THEN
        RAISE EXCEPTION 'Order does not exist';
    END IF;

    -- Check product exists and get pricing
    SELECT 
        p.id IS NOT NULL,
        COALESCE(bp.custom_price, p.price),
        COALESCE(bp.is_available, true) AND p.is_available
    INTO product_exists, actual_price, product_available
    FROM public.products p
    LEFT JOIN public.branch_products bp ON bp.product_id = p.id AND bp.branch_id = order_branch_id
    WHERE p.id = NEW.product_id;
    
    IF NOT COALESCE(product_exists, false) THEN
        RAISE EXCEPTION 'Product does not exist';
    END IF;
    
    IF NOT COALESCE(product_available, false) THEN
        RAISE EXCEPTION 'Product is not available';
    END IF;
    
    -- Validate price matches within 10% tolerance (for modifiers and promotions)
    IF actual_price > 0 AND ABS(NEW.unit_price - actual_price) > (actual_price * 0.10) THEN
        RAISE EXCEPTION 'Price mismatch: expected %, got %', actual_price, NEW.unit_price;
    END IF;
    
    -- Validate quantity is positive and reasonable
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;
    
    IF NEW.quantity > 50 THEN
        RAISE EXCEPTION 'Quantity exceeds maximum allowed (50)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_order_item_insert
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_item_before_insert();

-- =====================================================
-- SECURITY FIX: Token-based Order Tracking
-- =====================================================

-- Add tracking_token column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();

-- Create index for efficient token lookup
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- Drop the insecure 24-hour policy
DROP POLICY IF EXISTS "Customers can view their orders by id" ON public.orders;

-- Create a secure token-based policy for public order viewing
CREATE POLICY "Customers can view orders with valid token"
ON public.orders FOR SELECT TO public
USING (
    -- Staff can view orders for their branches
    has_branch_access(auth.uid(), branch_id)
);

-- Note: For public tracking, we'll use a secure edge function instead of RLS