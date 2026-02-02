-- =====================================================
-- FIX: Recursive RLS Policy on user_branch_roles
-- Drop existing policies first, then recreate
-- =====================================================

-- Drop ALL existing policies on user_branch_roles to start fresh
DROP POLICY IF EXISTS "ubr_branch_managers" ON user_branch_roles;
DROP POLICY IF EXISTS "ubr_superadmin" ON user_branch_roles;
DROP POLICY IF EXISTS "ubr_own_read" ON user_branch_roles;
DROP POLICY IF EXISTS "ubr_managers_read" ON user_branch_roles;
DROP POLICY IF EXISTS "ubr_managers_write" ON user_branch_roles;
DROP POLICY IF EXISTS "ubr_managers_update" ON user_branch_roles;

-- Create SECURITY DEFINER function to check if user is a branch manager
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_branch_manager_v2(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND local_role IN ('encargado', 'franquiciado')
    AND is_active = true
  )
$$;

-- Create new non-recursive policies for user_branch_roles

-- Users can read their own branch roles
CREATE POLICY "ubr_own_read" ON user_branch_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Superadmins can do everything
CREATE POLICY "ubr_superadmin" ON user_branch_roles
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- Branch managers can manage roles for their branches (using the new function)
CREATE POLICY "ubr_managers_read" ON user_branch_roles
  FOR SELECT TO authenticated
  USING (is_branch_manager_v2(auth.uid(), branch_id));

CREATE POLICY "ubr_managers_write" ON user_branch_roles
  FOR INSERT TO authenticated
  WITH CHECK (is_branch_manager_v2(auth.uid(), branch_id));

CREATE POLICY "ubr_managers_update" ON user_branch_roles
  FOR UPDATE TO authenticated
  USING (is_branch_manager_v2(auth.uid(), branch_id))
  WITH CHECK (is_branch_manager_v2(auth.uid(), branch_id));