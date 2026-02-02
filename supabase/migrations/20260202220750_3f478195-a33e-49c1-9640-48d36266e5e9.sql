-- Issue 3 & 8: Fix RLS functions to use user_branch_roles instead of user_roles_v2.branch_ids

-- Update is_hr_role to use user_branch_roles (fixes employee_schedules RLS)
CREATE OR REPLACE FUNCTION public.is_hr_role(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND local_role IN ('franquiciado', 'encargado')
    AND is_active = true
  )
$$;

-- Drop and recreate the communications policy to use is_hr_for_branch_v2
DROP POLICY IF EXISTS "Local managers can manage local communications" ON communications;

CREATE POLICY "Local managers can manage local communications"
ON communications FOR ALL
TO authenticated
USING (
  source_type = 'local' 
  AND is_hr_for_branch_v2(auth.uid(), source_branch_id)
)
WITH CHECK (
  source_type = 'local' 
  AND is_hr_for_branch_v2(auth.uid(), source_branch_id)
);