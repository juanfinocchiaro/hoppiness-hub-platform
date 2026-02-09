-- Fix: Make global holidays (branch_id IS NULL) visible to ALL authenticated users
-- This ensures all branches can see the holiday highlighting in the schedule editor

-- First, drop the restrictive staff-only policy
DROP POLICY IF EXISTS "special_days_staff_select" ON public.special_days;

-- Create a new policy that:
-- 1. Allows ALL authenticated users to read global holidays (branch_id IS NULL)
-- 2. Keeps staff-only access for branch-specific special days
CREATE POLICY "special_days_select_global_holidays"
ON public.special_days
FOR SELECT
TO authenticated
USING (
  branch_id IS NULL 
  OR is_staff(auth.uid())
);

-- Add comment for clarity
COMMENT ON POLICY "special_days_select_global_holidays" ON public.special_days IS 
'Permite a todos los usuarios autenticados ver los feriados globales (branch_id IS NULL). Los días especiales por sucursal requieren ser staff.';