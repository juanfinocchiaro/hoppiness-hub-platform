-- =========================================
-- FASE 7: Sistema de Adelantos Simplificado
-- =========================================

-- 1. Add user_id column if it doesn't exist (to migrate from employee_id)
ALTER TABLE public.salary_advances 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Update RLS policies for salary_advances
DROP POLICY IF EXISTS "Users can view own advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Managers can manage advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Employees can view own advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Managers can insert advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Managers can update advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Managers can view branch advances" ON public.salary_advances;

-- Users can view their own advances
CREATE POLICY "Users can view own advances"
ON public.salary_advances FOR SELECT
USING (user_id = auth.uid());

-- Managers can view all advances in their branch
CREATE POLICY "Managers can view branch advances"
ON public.salary_advances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR (
        ur.local_role IN ('encargado', 'franquiciado', 'contador_local')
        AND salary_advances.branch_id = ANY(ur.branch_ids)
      )
    )
  )
);

-- Managers can create advances (including self-approval for encargados)
CREATE POLICY "Managers can insert advances"
ON public.salary_advances FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR (
        ur.local_role IN ('encargado', 'franquiciado')
        AND branch_id = ANY(ur.branch_ids)
      )
    )
  )
);

-- Managers can update advances
CREATE POLICY "Managers can update advances"
ON public.salary_advances FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR (
        ur.local_role IN ('encargado', 'franquiciado', 'contador_local')
        AND salary_advances.branch_id = ANY(ur.branch_ids)
      )
    )
  )
);

-- 3. Create index for user_id queries
CREATE INDEX IF NOT EXISTS idx_salary_advances_user_id ON public.salary_advances(user_id);