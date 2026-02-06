-- Fix meeting_agreements INSERT policy to handle brand meetings (branch_id = NULL)

-- Drop existing policy
DROP POLICY IF EXISTS "meeting_agreements_insert" ON public.meeting_agreements;

-- Create new policy that handles both local and brand meetings
CREATE POLICY "meeting_agreements_insert" ON public.meeting_agreements
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_agreements.meeting_id
    AND (
      -- Local meetings: must be HR for the branch
      (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR
      -- Brand meetings (branch_id = NULL): must be creator, superadmin, or coordinador
      (m.branch_id IS NULL AND (
        m.created_by = auth.uid() 
        OR is_superadmin(auth.uid()) 
        OR get_brand_role(auth.uid()) = 'coordinador'::brand_role_type
      ))
    )
  )
);