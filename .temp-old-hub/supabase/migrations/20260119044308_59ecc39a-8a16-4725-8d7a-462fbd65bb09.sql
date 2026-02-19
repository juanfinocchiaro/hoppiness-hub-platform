-- Drop existing modifier tables (they're empty, no data to migrate)
DROP TABLE IF EXISTS public.order_item_modifiers CASCADE;
DROP TABLE IF EXISTS public.modifier_options CASCADE;
DROP TABLE IF EXISTS public.product_modifier_groups CASCADE;

-- Create global modifier groups catalog
CREATE TABLE public.modifier_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    selection_type TEXT NOT NULL DEFAULT 'multiple' CHECK (selection_type IN ('single', 'multiple')),
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create global modifier options (extras)
CREATE TABLE public.modifier_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table: which products have which modifier groups
CREATE TABLE public.product_modifier_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, modifier_group_id)
);

-- Order item modifiers for recording selections
CREATE TABLE public.order_item_modifiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES public.modifier_options(id),
    option_name TEXT NOT NULL,
    price_adjustment NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modifier_groups
CREATE POLICY "Anyone can view active modifier groups"
ON public.modifier_groups FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage modifier groups"
ON public.modifier_groups FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for modifier_options
CREATE POLICY "Anyone can view active modifier options"
ON public.modifier_options FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage modifier options"
ON public.modifier_options FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for product_modifier_assignments
CREATE POLICY "Anyone can view enabled assignments"
ON public.product_modifier_assignments FOR SELECT
USING (is_enabled = true);

CREATE POLICY "Admins can manage modifier assignments"
ON public.product_modifier_assignments FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for order_item_modifiers
CREATE POLICY "Customers can view their order modifiers"
ON public.order_item_modifiers FOR SELECT
USING (EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_modifiers.order_item_id
    AND o.created_at > (now() - interval '24 hours')
));

CREATE POLICY "Modifiers can be added with order items"
ON public.order_item_modifiers FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_modifiers.order_item_id
    AND o.created_at > (now() - interval '1 hour')
));

CREATE POLICY "Staff can view order item modifiers"
ON public.order_item_modifiers FOR SELECT
USING (EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_modifiers.order_item_id
    AND has_branch_access(auth.uid(), o.branch_id)
));

-- Create indexes for performance
CREATE INDEX idx_modifier_options_group ON public.modifier_options(group_id);
CREATE INDEX idx_product_modifier_assignments_product ON public.product_modifier_assignments(product_id);
CREATE INDEX idx_product_modifier_assignments_group ON public.product_modifier_assignments(modifier_group_id);
CREATE INDEX idx_order_item_modifiers_item ON public.order_item_modifiers(order_item_id);