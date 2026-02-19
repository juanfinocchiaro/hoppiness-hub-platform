-- Create table for branch-level modifier option availability
CREATE TABLE public.branch_modifier_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  modifier_option_id UUID NOT NULL REFERENCES public.modifier_options(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, modifier_option_id)
);

-- Enable RLS
ALTER TABLE public.branch_modifier_options ENABLE ROW LEVEL SECURITY;

-- Anyone can view availability
CREATE POLICY "Anyone can view branch modifier availability"
ON public.branch_modifier_options
FOR SELECT
USING (true);

-- Staff can manage their branch's modifier availability
CREATE POLICY "Staff can manage branch modifier options"
ON public.branch_modifier_options
FOR ALL
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_products'))
WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_products'));

-- Create trigger to auto-create availability entries for new branches
CREATE OR REPLACE FUNCTION public.setup_branch_modifier_options()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.branch_modifier_options (branch_id, modifier_option_id, is_available)
    SELECT 
        NEW.id,
        mo.id,
        true
    FROM public.modifier_options mo
    WHERE mo.is_active = true;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_branch_created_setup_modifiers
AFTER INSERT ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.setup_branch_modifier_options();

-- Create trigger to add new modifier options to all branches
CREATE OR REPLACE FUNCTION public.sync_modifier_option_to_branches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.branch_modifier_options (branch_id, modifier_option_id, is_available)
    SELECT 
        b.id,
        NEW.id,
        true
    FROM public.branches b
    WHERE b.is_active = true
    ON CONFLICT (branch_id, modifier_option_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_modifier_option_created_sync
AFTER INSERT ON public.modifier_options
FOR EACH ROW
EXECUTE FUNCTION public.sync_modifier_option_to_branches();

-- Populate existing branches with all modifier options
INSERT INTO public.branch_modifier_options (branch_id, modifier_option_id, is_available)
SELECT b.id, mo.id, true
FROM public.branches b
CROSS JOIN public.modifier_options mo
WHERE b.is_active = true AND mo.is_active = true
ON CONFLICT DO NOTHING;