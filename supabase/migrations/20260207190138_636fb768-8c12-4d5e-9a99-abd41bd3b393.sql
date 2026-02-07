-- =====================================================
-- LIMPIEZA DE POLÍTICAS RLS DUPLICADAS
-- Consolidación de políticas v2/v3/hr en una sola versión optimizada
-- =====================================================

-- ========== TABLA: warnings ==========
-- Eliminar políticas redundantes/legacy
DROP POLICY IF EXISTS "warnings_hr" ON public.warnings;
DROP POLICY IF EXISTS "warnings_hr_insert" ON public.warnings;
DROP POLICY IF EXISTS "warnings_hr_select" ON public.warnings;
DROP POLICY IF EXISTS "warnings_hr_update" ON public.warnings;
DROP POLICY IF EXISTS "warnings_insert_v3" ON public.warnings;
DROP POLICY IF EXISTS "warnings_select_v3" ON public.warnings;
DROP POLICY IF EXISTS "warnings_update_v3" ON public.warnings;
DROP POLICY IF EXISTS "warnings_delete_v3" ON public.warnings;
DROP POLICY IF EXISTS "warnings_own_select" ON public.warnings;
DROP POLICY IF EXISTS "Franquiciado and Encargado can manage warnings" ON public.warnings;
DROP POLICY IF EXISTS "Managers can insert warnings" ON public.warnings;
DROP POLICY IF EXISTS "Managers can update warnings" ON public.warnings;
DROP POLICY IF EXISTS "Managers can view branch warnings" ON public.warnings;
DROP POLICY IF EXISTS "Superadmin can manage all warnings" ON public.warnings;
DROP POLICY IF EXISTS "Users can acknowledge own warnings" ON public.warnings;
DROP POLICY IF EXISTS "Users can view own warnings" ON public.warnings;

-- Crear políticas consolidadas para warnings
CREATE POLICY "warnings_select_consolidated" ON public.warnings
FOR SELECT USING (
  user_id = auth.uid() OR is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "warnings_insert_consolidated" ON public.warnings
FOR INSERT WITH CHECK (
  is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "warnings_update_consolidated" ON public.warnings
FOR UPDATE USING (
  is_hr_role(auth.uid(), branch_id) OR user_id = auth.uid()
);

CREATE POLICY "warnings_delete_consolidated" ON public.warnings
FOR DELETE USING (
  is_superadmin(auth.uid())
);

-- ========== TABLA: salary_advances ==========
-- Verificar y eliminar duplicadas si existen
DROP POLICY IF EXISTS "salary_advances_select_v2" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_select_v3" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_insert_v2" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_insert_v3" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_update_v2" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_update_v3" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_hr" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_own" ON public.salary_advances;
DROP POLICY IF EXISTS "Employees can view own advances" ON public.salary_advances;
DROP POLICY IF EXISTS "HR can manage advances" ON public.salary_advances;

-- Crear políticas consolidadas para salary_advances
CREATE POLICY "salary_advances_select_consolidated" ON public.salary_advances
FOR SELECT USING (
  employee_id = auth.uid() OR user_id = auth.uid() OR is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "salary_advances_insert_consolidated" ON public.salary_advances
FOR INSERT WITH CHECK (
  is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "salary_advances_update_consolidated" ON public.salary_advances
FOR UPDATE USING (
  is_hr_role(auth.uid(), branch_id)
);

-- ========== TABLA: shift_closures ==========
-- Eliminar políticas duplicadas
DROP POLICY IF EXISTS "shift_closures_select_v2" ON public.shift_closures;
DROP POLICY IF EXISTS "shift_closures_select_v3" ON public.shift_closures;
DROP POLICY IF EXISTS "shift_closures_insert_v3" ON public.shift_closures;
DROP POLICY IF EXISTS "shift_closures_update_v2" ON public.shift_closures;
DROP POLICY IF EXISTS "shift_closures_update_v3" ON public.shift_closures;
DROP POLICY IF EXISTS "Users can view closures for their branches" ON public.shift_closures;
DROP POLICY IF EXISTS "Staff can update closures" ON public.shift_closures;

-- Crear políticas consolidadas para shift_closures
CREATE POLICY "shift_closures_select_consolidated" ON public.shift_closures
FOR SELECT USING (
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "shift_closures_insert_consolidated" ON public.shift_closures
FOR INSERT WITH CHECK (
  can_close_shift(auth.uid(), branch_id)
);

CREATE POLICY "shift_closures_update_consolidated" ON public.shift_closures
FOR UPDATE USING (
  can_close_shift(auth.uid(), branch_id)
);

-- ========== TABLA: clock_entries ==========
-- Eliminar duplicadas
DROP POLICY IF EXISTS "clock_entries_admin" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_hr_select" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_insert_own" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_insert_v3" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_own_select" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_select_v3" ON public.clock_entries;

-- Crear políticas consolidadas para clock_entries
CREATE POLICY "clock_entries_select_consolidated" ON public.clock_entries
FOR SELECT USING (
  user_id = auth.uid() OR is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "clock_entries_insert_consolidated" ON public.clock_entries
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND can_access_branch(auth.uid(), branch_id)
);

-- ========== TABLA: schedule_requests ==========
-- Eliminar duplicadas
DROP POLICY IF EXISTS "Users can create own requests" ON public.schedule_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_hr" ON public.schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_insert_v3" ON public.schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_select_v3" ON public.schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_update_v3" ON public.schedule_requests;

-- Crear políticas consolidadas para schedule_requests
CREATE POLICY "schedule_requests_select_consolidated" ON public.schedule_requests
FOR SELECT USING (
  user_id = auth.uid() OR is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "schedule_requests_insert_consolidated" ON public.schedule_requests
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "schedule_requests_update_consolidated" ON public.schedule_requests
FOR UPDATE USING (
  is_hr_role(auth.uid(), branch_id)
);

-- ========== TABLA: employee_schedules ==========
-- Eliminar duplicadas
DROP POLICY IF EXISTS "employee_schedules_hr" ON public.employee_schedules;
DROP POLICY IF EXISTS "employee_schedules_delete_v3" ON public.employee_schedules;
DROP POLICY IF EXISTS "employee_schedules_insert_v3" ON public.employee_schedules;
DROP POLICY IF EXISTS "employee_schedules_select_v3" ON public.employee_schedules;
DROP POLICY IF EXISTS "employee_schedules_update_v3" ON public.employee_schedules;

-- Crear políticas consolidadas para employee_schedules
CREATE POLICY "employee_schedules_select_consolidated" ON public.employee_schedules
FOR SELECT USING (
  employee_id = auth.uid() OR is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "employee_schedules_insert_consolidated" ON public.employee_schedules
FOR INSERT WITH CHECK (
  is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "employee_schedules_update_consolidated" ON public.employee_schedules
FOR UPDATE USING (
  is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "employee_schedules_delete_consolidated" ON public.employee_schedules
FOR DELETE USING (
  is_hr_role(auth.uid(), branch_id)
);