-- =====================================================
-- FASE 1: CREAR FUNCIONES HELPER SIMPLIFICADAS (V2)
-- =====================================================

-- Recrear is_superadmin con lógica correcta
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id 
    AND brand_role = 'superadmin'
    AND is_active = true
  )
$$;

-- Función para verificar acceso a sucursal
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id 
    AND is_active = true
    AND (
      brand_role = 'superadmin'
      OR _branch_id = ANY(branch_ids)
    )
  )
$$;

-- Función para verificar si es HR (puede gestionar equipo)
CREATE OR REPLACE FUNCTION public.is_hr_role(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id 
    AND is_active = true
    AND (
      brand_role = 'superadmin'
      OR (local_role IN ('franquiciado', 'encargado') AND _branch_id = ANY(branch_ids))
    )
  )
$$;

-- Función para verificar si tiene algún rol activo (es staff)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id 
    AND is_active = true
    AND (brand_role IS NOT NULL OR local_role IS NOT NULL)
  )
$$;

-- =====================================================
-- FASE 2: POLÍTICAS PARA TABLAS ACTIVAS
-- =====================================================

-- profiles: Acceso propio + HR de sucursales asignadas
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "allow_anon_insert" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "profiles_select_v2" ON profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "profiles_update_v2" ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_roles_v2: Solo admin
DROP POLICY IF EXISTS "superadmin_full_access" ON user_roles_v2;
DROP POLICY IF EXISTS "users_read_own_role" ON user_roles_v2;

CREATE POLICY "roles_select_v2" ON user_roles_v2 FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "roles_insert_v2" ON user_roles_v2 FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "roles_update_v2" ON user_roles_v2 FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "roles_delete_v2" ON user_roles_v2 FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- branches: Público para lectura (activas), staff para asignadas
DROP POLICY IF EXISTS "branches_public_read" ON branches;
DROP POLICY IF EXISTS "Branches are viewable by authenticated users" ON branches;
DROP POLICY IF EXISTS "Public can view active branches" ON branches;

CREATE POLICY "branches_anon_read" ON branches FOR SELECT TO anon
  USING (is_active = true AND public_status IN ('active', 'coming_soon'));

CREATE POLICY "branches_auth_read" ON branches FOR SELECT TO authenticated
  USING (
    is_active = true 
    OR public.is_superadmin(auth.uid())
    OR public.can_access_branch(auth.uid(), id)
  );

CREATE POLICY "branches_admin_write" ON branches FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- branch_shifts: Staff de la sucursal
ALTER TABLE branch_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_shifts_read" ON branch_shifts;
DROP POLICY IF EXISTS "branch_shifts_write" ON branch_shifts;

CREATE POLICY "branch_shifts_select" ON branch_shifts FOR SELECT TO authenticated
  USING (public.can_access_branch(auth.uid(), branch_id));

CREATE POLICY "branch_shifts_modify" ON branch_shifts FOR ALL TO authenticated
  USING (public.is_hr_role(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- clock_entries: Propio + HR de la sucursal, INSERT público (fichaje)
ALTER TABLE clock_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clock_entries_select" ON clock_entries;
DROP POLICY IF EXISTS "clock_entries_insert" ON clock_entries;

CREATE POLICY "clock_entries_select_v2" ON clock_entries FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "clock_entries_insert_v2" ON clock_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "clock_entries_admin" ON clock_entries FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- shift_closures: Staff de la sucursal, Encargado+ para escribir
ALTER TABLE shift_closures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_closures_select" ON shift_closures;
DROP POLICY IF EXISTS "shift_closures_insert" ON shift_closures;
DROP POLICY IF EXISTS "shift_closures_update" ON shift_closures;

CREATE POLICY "shift_closures_select_v2" ON shift_closures FOR SELECT TO authenticated
  USING (public.can_access_branch(auth.uid(), branch_id));

CREATE POLICY "shift_closures_write_v2" ON shift_closures FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

CREATE POLICY "shift_closures_update_v2" ON shift_closures FOR UPDATE TO authenticated
  USING (public.is_hr_role(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- salary_advances: Propio + HR de la sucursal
ALTER TABLE salary_advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_advances_select" ON salary_advances;
DROP POLICY IF EXISTS "salary_advances_insert" ON salary_advances;
DROP POLICY IF EXISTS "salary_advances_update" ON salary_advances;

CREATE POLICY "salary_advances_select_v2" ON salary_advances FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "salary_advances_write_v2" ON salary_advances FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

CREATE POLICY "salary_advances_update_v2" ON salary_advances FOR UPDATE TO authenticated
  USING (public.is_hr_role(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- regulations: Staff puede leer activos, Admin escribe
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "regulations_select" ON regulations;

CREATE POLICY "regulations_select_v2" ON regulations FOR SELECT TO authenticated
  USING (is_active = true OR public.is_superadmin(auth.uid()));

CREATE POLICY "regulations_admin_v2" ON regulations FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- regulation_signatures: Propio + HR
ALTER TABLE regulation_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "regulation_signatures_select" ON regulation_signatures;
DROP POLICY IF EXISTS "regulation_signatures_insert" ON regulation_signatures;

CREATE POLICY "regulation_signatures_select_v2" ON regulation_signatures FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "regulation_signatures_insert_v2" ON regulation_signatures FOR INSERT TO authenticated
  WITH CHECK (true); -- Encargado sube firmas

-- communications: Staff destinatario
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "communications_select" ON communications;
DROP POLICY IF EXISTS "communications_insert" ON communications;

CREATE POLICY "communications_select_v2" ON communications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "communications_admin_v2" ON communications FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- communication_reads: Propio
ALTER TABLE communication_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "communication_reads_select" ON communication_reads;
DROP POLICY IF EXISTS "communication_reads_insert" ON communication_reads;

CREATE POLICY "communication_reads_own" ON communication_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "communication_reads_insert" ON communication_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- employee_schedules: Propio + HR
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_schedules_select" ON employee_schedules;

CREATE POLICY "employee_schedules_select_v2" ON employee_schedules FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "employee_schedules_hr" ON employee_schedules FOR ALL TO authenticated
  USING (public.is_hr_role(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- schedule_requests: Propio + HR
ALTER TABLE schedule_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedule_requests_select" ON schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_insert" ON schedule_requests;

CREATE POLICY "schedule_requests_select_v2" ON schedule_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "schedule_requests_insert_v2" ON schedule_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "schedule_requests_hr" ON schedule_requests FOR UPDATE TO authenticated
  USING (public.is_hr_role(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- special_days: Staff puede leer, Admin escribe
ALTER TABLE special_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "special_days_select" ON special_days;

CREATE POLICY "special_days_select_v2" ON special_days FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "special_days_admin" ON special_days FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- employee_data: Propio + HR
ALTER TABLE employee_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_data_select" ON employee_data;

CREATE POLICY "employee_data_select_v2" ON employee_data FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "employee_data_hr" ON employee_data FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- warnings: Propio + HR
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warnings_select" ON warnings;

CREATE POLICY "warnings_select_v2" ON warnings FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "warnings_hr" ON warnings FOR ALL TO authenticated
  USING (public.is_hr_role(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- contact_messages: Admin lee, Público inserta
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_messages_select" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_insert" ON contact_messages;
DROP POLICY IF EXISTS "Anyone can submit contact message" ON contact_messages;

CREATE POLICY "contact_messages_anon_insert" ON contact_messages FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "contact_messages_auth_insert" ON contact_messages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "contact_messages_admin_read" ON contact_messages FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- staff_invitations: Admin
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_invitations_select" ON staff_invitations;
DROP POLICY IF EXISTS "staff_invitations_insert" ON staff_invitations;
DROP POLICY IF EXISTS "Managers can view invitations" ON staff_invitations;
DROP POLICY IF EXISTS "Managers can create invitations" ON staff_invitations;

CREATE POLICY "staff_invitations_read" ON staff_invitations FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "staff_invitations_anon_read" ON staff_invitations FOR SELECT TO anon
  USING (status = 'pending');

CREATE POLICY "staff_invitations_write" ON staff_invitations FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- brand_closure_config: Admin
ALTER TABLE brand_closure_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_closure_config_read" ON brand_closure_config FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "brand_closure_config_admin" ON brand_closure_config FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- branch_closure_config: Staff de la sucursal
ALTER TABLE branch_closure_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_closure_config_read" ON branch_closure_config FOR SELECT TO authenticated
  USING (public.can_access_branch(auth.uid(), branch_id));

CREATE POLICY "branch_closure_config_admin" ON branch_closure_config FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- audit_logs: Solo superadmin
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;

CREATE POLICY "audit_logs_admin" ON audit_logs FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));