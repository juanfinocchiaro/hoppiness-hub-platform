-- Product Modifier Groups: groups of options for each product
CREATE TABLE public.product_modifier_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'multiple' CHECK (type IN ('single', 'multiple', 'required')),
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Modifier Options: individual choices within a group
CREATE TABLE public.modifier_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.product_modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order Item Modifiers: selected options for each order item
CREATE TABLE public.order_item_modifiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES public.modifier_options(id),
    option_name TEXT NOT NULL,
    price_adjustment NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_product_modifier_groups_product ON public.product_modifier_groups(product_id);
CREATE INDEX idx_modifier_options_group ON public.modifier_options(group_id);
CREATE INDEX idx_order_item_modifiers_order_item ON public.order_item_modifiers(order_item_id);

-- Enable RLS
ALTER TABLE public.product_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_modifier_groups
CREATE POLICY "Anyone can view active modifier groups"
    ON public.product_modifier_groups FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage modifier groups"
    ON public.product_modifier_groups FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for modifier_options
CREATE POLICY "Anyone can view available options"
    ON public.modifier_options FOR SELECT
    USING (is_available = true);

CREATE POLICY "Admins can manage modifier options"
    ON public.modifier_options FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for order_item_modifiers
CREATE POLICY "Modifiers can be added with order items"
    ON public.order_item_modifiers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_id
        AND o.created_at > now() - interval '1 hour'
    ));

CREATE POLICY "Staff can view order item modifiers"
    ON public.order_item_modifiers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_id
        AND has_branch_access(auth.uid(), o.branch_id)
    ));

CREATE POLICY "Customers can view their order modifiers"
    ON public.order_item_modifiers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_id
        AND o.created_at > now() - interval '24 hours'
    ));