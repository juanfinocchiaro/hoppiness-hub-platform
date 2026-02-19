-- ========================================================
-- SECURITY FIX: Add branch isolation to sensitive data tables
-- Issue: HR managers could read ALL profiles/employee_data across ALL branches
-- Fix: Restrict HR access to only employees in their assigned branches
-- ========================================================

-- 1. Fix profiles table SELECT policy: Add branch isolation for HR managers
-- Current issue: is_hr_manager(auth.uid()) allows access to ALL profiles without branch check

DROP POLICY IF EXISTS "profiles_select_own_or_hr" ON public.profiles;

CREATE POLICY "profiles_select_own_or_hr_branch_scoped"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can view their own profile
  id = auth.uid()
  -- Superadmins can view all profiles
  OR is_admin_v2(auth.uid())
  -- HR managers can ONLY view profiles of employees in their branches
  OR (
    is_hr_manager(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.employee_data ed
      WHERE ed.user_id = profiles.user_id
      AND has_branch_access_v2(auth.uid(), ed.branch_id)
    )
  )
);

-- Also update the legacy policy with the same name pattern
DROP POLICY IF EXISTS "Users view own profile or HR managers view staff" ON public.profiles;

CREATE POLICY "Users view own profile or HR managers view staff"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can view their own profile
  user_id = auth.uid()
  -- Superadmins can view all profiles
  OR is_superadmin(auth.uid())
  -- Brand-level coordinators can view relevant staff profiles
  OR (
    EXISTS (
      SELECT 1 FROM user_roles_v2 ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND ur.brand_role IN ('superadmin', 'coordinador')
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles_v2 target_ur
      WHERE target_ur.user_id = profiles.user_id
      AND target_ur.is_active = true
      AND (target_ur.brand_role IS NOT NULL OR target_ur.local_role IS NOT NULL)
    )
  )
  -- Local HR managers can ONLY view profiles of employees in their branches
  OR (
    EXISTS (
      SELECT 1 FROM user_roles_v2 ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND ur.local_role IN ('encargado', 'franquiciado')
    )
    AND EXISTS (
      SELECT 1 FROM public.employee_data ed
      WHERE ed.user_id = profiles.user_id
      AND has_branch_access_v2(auth.uid(), ed.branch_id)
    )
  )
);


-- 2. Fix employee_data table SELECT policy: Add branch isolation
-- Current issue: is_hr_manager(auth.uid()) allows access to ALL employee_data without branch check

DROP POLICY IF EXISTS "employee_data_select_hr" ON public.employee_data;

CREATE POLICY "employee_data_select_branch_scoped"
ON public.employee_data
FOR SELECT
TO authenticated
USING (
  -- Users can view their own data
  user_id = auth.uid()
  -- Superadmins can view all
  OR is_admin_v2(auth.uid())
  -- HR managers can ONLY view employee_data for their branches
  OR (
    is_hr_manager(auth.uid())
    AND has_branch_access_v2(auth.uid(), branch_id)
  )
);