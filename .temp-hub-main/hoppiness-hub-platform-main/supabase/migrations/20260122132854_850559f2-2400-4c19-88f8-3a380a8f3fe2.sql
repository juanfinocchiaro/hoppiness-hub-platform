
-- =====================================================
-- FIX: Employees RLS - use existing functions
-- =====================================================

-- Drop the policy with non-existent function
DROP POLICY IF EXISTS "Employees viewable by authenticated users" ON public.employees;

-- Create correct policy using existing has_branch_access function
CREATE POLICY "Employees viewable by branch staff"
ON public.employees
FOR SELECT
TO authenticated
USING (
  has_branch_access(auth.uid(), branch_id)
);
