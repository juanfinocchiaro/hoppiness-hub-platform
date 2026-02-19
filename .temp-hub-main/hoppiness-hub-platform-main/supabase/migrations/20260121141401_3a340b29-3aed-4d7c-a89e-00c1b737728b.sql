-- Update INSERT policy for cash_register_shifts to allow admins
DROP POLICY IF EXISTS "Staff can create shifts" ON public.cash_register_shifts;

CREATE POLICY "Staff can create shifts" 
ON public.cash_register_shifts 
FOR INSERT 
WITH CHECK (
  public.is_admin(auth.uid()) OR 
  public.has_branch_access(auth.uid(), branch_id)
);

-- Also update SELECT and UPDATE policies
DROP POLICY IF EXISTS "Staff can view branch shifts" ON public.cash_register_shifts;
DROP POLICY IF EXISTS "Staff can update shifts" ON public.cash_register_shifts;

CREATE POLICY "Staff can view branch shifts" 
ON public.cash_register_shifts 
FOR SELECT 
USING (
  public.is_admin(auth.uid()) OR 
  public.has_branch_access(auth.uid(), branch_id)
);

CREATE POLICY "Staff can update shifts" 
ON public.cash_register_shifts 
FOR UPDATE 
USING (
  public.is_admin(auth.uid()) OR 
  public.has_branch_access(auth.uid(), branch_id)
)
WITH CHECK (
  public.is_admin(auth.uid()) OR 
  public.has_branch_access(auth.uid(), branch_id)
);