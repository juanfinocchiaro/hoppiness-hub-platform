-- Create delivery zones table for each branch
CREATE TABLE public.delivery_zones (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    polygon_coords JSONB, -- For future map integration
    neighborhoods TEXT[], -- List of neighborhood names covered
    delivery_fee NUMERIC DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    estimated_time_min INTEGER DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for branch lookup
CREATE INDEX idx_delivery_zones_branch_id ON public.delivery_zones(branch_id);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Anyone can view active delivery zones (for customers checking delivery availability)
CREATE POLICY "Anyone can view active delivery zones"
ON public.delivery_zones
FOR SELECT
USING (is_active = true);

-- Staff with branch access can manage delivery zones
CREATE POLICY "Staff can manage delivery zones"
ON public.delivery_zones
FOR ALL
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- Trigger for updated_at
CREATE TRIGGER update_delivery_zones_updated_at
BEFORE UPDATE ON public.delivery_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();