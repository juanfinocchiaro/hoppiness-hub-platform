-- ==========================================================
-- MIGRACIÓN DE LIMPIEZA RLS V3
-- Resuelve: cajero bloqueado en shift_closures + políticas duplicadas
-- ==========================================================

-- 1. CREAR FUNCIÓN can_close_shift que incluye cajero
CREATE OR REPLACE FUNCTION public.can_close_shift(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND local_role IN ('franquiciado', 'encargado', 'cajero')
    AND is_active = true
  )
$$;

-- 2. MIGRAR can_access_branch para usar user_branch_roles
-- (manteniendo compatibilidad con superadmin desde user_roles_v2)
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND is_active = true
  )
$$;

-- ==========================================================
-- 3. LIMPIAR POLÍTICAS shift_closures
-- ==========================================================
DROP POLICY IF EXISTS "Managers can create closures" ON shift_closures;
DROP POLICY IF EXISTS "Managers can update closures" ON shift_closures;
DROP POLICY IF EXISTS "Managers can view closures" ON shift_closures;
DROP POLICY IF EXISTS "Staff can insert closures" ON shift_closures;
DROP POLICY IF EXISTS "Staff can view closures" ON shift_closures;
DROP POLICY IF EXISTS "shift_closures_write_v2" ON shift_closures;
DROP POLICY IF EXISTS "shift_closures_read_v2" ON shift_closures;

-- Nuevas políticas v3
CREATE POLICY "shift_closures_select_v3" ON shift_closures
  FOR SELECT USING (public.can_access_branch(auth.uid(), branch_id));

CREATE POLICY "shift_closures_insert_v3" ON shift_closures
  FOR INSERT WITH CHECK (public.can_close_shift(auth.uid(), branch_id));

CREATE POLICY "shift_closures_update_v3" ON shift_closures
  FOR UPDATE USING (public.can_close_shift(auth.uid(), branch_id));

-- ==========================================================
-- 4. LIMPIAR POLÍTICAS warnings
-- ==========================================================
DROP POLICY IF EXISTS "Enable ALL for managers" ON warnings;
DROP POLICY IF EXISTS "Enable insert for managers" ON warnings;
DROP POLICY IF EXISTS "Enable select for managers" ON warnings;
DROP POLICY IF EXISTS "Enable update for managers" ON warnings;
DROP POLICY IF EXISTS "Employees can view own warnings" ON warnings;
DROP POLICY IF EXISTS "Managers can manage warnings" ON warnings;
DROP POLICY IF EXISTS "warnings_delete_v2" ON warnings;
DROP POLICY IF EXISTS "warnings_insert_v2" ON warnings;
DROP POLICY IF EXISTS "warnings_select_v2" ON warnings;
DROP POLICY IF EXISTS "warnings_update_v2" ON warnings;
DROP POLICY IF EXISTS "warnings_all_v2" ON warnings;

-- Nuevas políticas v3
CREATE POLICY "warnings_select_v3" ON warnings
  FOR SELECT USING (
    user_id = auth.uid() -- Empleado ve las propias
    OR public.is_hr_role(auth.uid(), branch_id) -- HR ve todas del local
  );

CREATE POLICY "warnings_insert_v3" ON warnings
  FOR INSERT WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

CREATE POLICY "warnings_update_v3" ON warnings
  FOR UPDATE USING (public.is_hr_role(auth.uid(), branch_id));

CREATE POLICY "warnings_delete_v3" ON warnings
  FOR DELETE USING (public.is_superadmin(auth.uid()));

-- ==========================================================
-- 5. LIMPIAR POLÍTICAS salary_advances
-- ==========================================================
DROP POLICY IF EXISTS "Managers can manage advances" ON salary_advances;
DROP POLICY IF EXISTS "salary_advances_delete_v2" ON salary_advances;
DROP POLICY IF EXISTS "salary_advances_insert_v2" ON salary_advances;
DROP POLICY IF EXISTS "salary_advances_select_v2" ON salary_advances;
DROP POLICY IF EXISTS "salary_advances_update_v2" ON salary_advances;
DROP POLICY IF EXISTS "Employees can view own advances" ON salary_advances;
DROP POLICY IF EXISTS "Enable insert for managers" ON salary_advances;
DROP POLICY IF EXISTS "Enable select for managers" ON salary_advances;
DROP POLICY IF EXISTS "Enable update for managers" ON salary_advances;

-- Nuevas políticas v3
CREATE POLICY "salary_advances_select_v3" ON salary_advances
  FOR SELECT USING (
    employee_id = auth.uid() -- Empleado ve las propias
    OR public.is_hr_role(auth.uid(), branch_id) -- HR ve todas del local
  );

CREATE POLICY "salary_advances_insert_v3" ON salary_advances
  FOR INSERT WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

CREATE POLICY "salary_advances_update_v3" ON salary_advances
  FOR UPDATE USING (public.is_hr_role(auth.uid(), branch_id));

-- ==========================================================
-- 6. LIMPIAR POLÍTICAS schedule_requests
-- ==========================================================
DROP POLICY IF EXISTS "Employees can view own requests" ON schedule_requests;
DROP POLICY IF EXISTS "Managers can view branch requests" ON schedule_requests;
DROP POLICY IF EXISTS "Users can create requests" ON schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_insert_v2" ON schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_select_v2" ON schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_update_v2" ON schedule_requests;

-- Nuevas políticas v3
CREATE POLICY "schedule_requests_select_v3" ON schedule_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "schedule_requests_insert_v3" ON schedule_requests
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_branch(auth.uid(), branch_id)
  );

CREATE POLICY "schedule_requests_update_v3" ON schedule_requests
  FOR UPDATE USING (public.is_hr_role(auth.uid(), branch_id));

-- ==========================================================
-- 7. LIMPIAR POLÍTICAS clock_entries
-- ==========================================================
DROP POLICY IF EXISTS "Staff can insert own clock entries" ON clock_entries;
DROP POLICY IF EXISTS "Staff can view own clock entries" ON clock_entries;
DROP POLICY IF EXISTS "Managers can view team clock entries" ON clock_entries;
DROP POLICY IF EXISTS "clock_entries_insert_v2" ON clock_entries;
DROP POLICY IF EXISTS "clock_entries_select_v2" ON clock_entries;

-- Nuevas políticas v3
CREATE POLICY "clock_entries_select_v3" ON clock_entries
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "clock_entries_insert_v3" ON clock_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_branch(auth.uid(), branch_id)
  );

-- ==========================================================
-- 8. LIMPIAR POLÍTICAS employee_schedules
-- ==========================================================
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON employee_schedules;
DROP POLICY IF EXISTS "Employees can view own schedules" ON employee_schedules;
DROP POLICY IF EXISTS "Managers can manage schedules" ON employee_schedules;
DROP POLICY IF EXISTS "employee_schedules_select_v2" ON employee_schedules;

-- Nuevas políticas v3
CREATE POLICY "employee_schedules_select_v3" ON employee_schedules
  FOR SELECT USING (
    employee_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "employee_schedules_insert_v3" ON employee_schedules
  FOR INSERT WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

CREATE POLICY "employee_schedules_update_v3" ON employee_schedules
  FOR UPDATE USING (public.is_hr_role(auth.uid(), branch_id));

CREATE POLICY "employee_schedules_delete_v3" ON employee_schedules
  FOR DELETE USING (public.is_hr_role(auth.uid(), branch_id));