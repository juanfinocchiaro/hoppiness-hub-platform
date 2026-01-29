-- =====================================================
-- LIMPIAR POLÍTICAS PERMISIVAS Y AGREGAR FALTANTES (CORREGIDO)
-- =====================================================

-- ========================
-- EMPLOYEE_DATA - Tiene user_id
-- ========================
DROP POLICY IF EXISTS "Anyone can view employee data" ON public.employee_data;
DROP POLICY IF EXISTS "Public can view employee data" ON public.employee_data;

CREATE POLICY "employee_data_select_hr"
ON public.employee_data FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

-- ========================
-- EMPLOYEE_PRIVATE_DETAILS - Tiene employee_id
-- ========================
DROP POLICY IF EXISTS "Anyone can view private details" ON public.employee_private_details;
DROP POLICY IF EXISTS "Public can view private details" ON public.employee_private_details;

CREATE POLICY "employee_private_details_select_hr"
ON public.employee_private_details FOR SELECT
TO authenticated
USING (
  employee_id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

-- ========================
-- EMPLOYEE_WARNINGS - Tiene employee_id
-- ========================
DROP POLICY IF EXISTS "Anyone can view warnings" ON public.employee_warnings;
DROP POLICY IF EXISTS "Public can view warnings" ON public.employee_warnings;

CREATE POLICY "employee_warnings_select_hr"
ON public.employee_warnings FOR SELECT
TO authenticated
USING (
  employee_id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

-- ========================
-- CASH_REGISTER_MOVEMENTS - Tiene branch_id
-- ========================
DROP POLICY IF EXISTS "Anyone can view movements" ON public.cash_register_movements;
DROP POLICY IF EXISTS "Public can view movements" ON public.cash_register_movements;

CREATE POLICY "cash_register_movements_select_staff"
ON public.cash_register_movements FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), branch_id)
);

-- ========================
-- CUSTOMER_ADDRESSES - Tiene customer_id (relacionado con customers)
-- ========================
DROP POLICY IF EXISTS "Anyone can view addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Public can view addresses" ON public.customer_addresses;

CREATE POLICY "customer_addresses_select_staff"
ON public.customer_addresses FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND ur.local_role IS NOT NULL
  )
);

-- ========================
-- USER_INVITATIONS - Tiene invited_by
-- ========================
DROP POLICY IF EXISTS "Anyone can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Public can view invitations" ON public.user_invitations;

CREATE POLICY "user_invitations_select_admin"
ON public.user_invitations FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

-- ========================
-- KDS_TOKENS - Tiene branch_id
-- ========================
DROP POLICY IF EXISTS "Anyone can view kds tokens" ON public.kds_tokens;
DROP POLICY IF EXISTS "Public can view kds tokens" ON public.kds_tokens;

CREATE POLICY "kds_tokens_select_managers"
ON public.kds_tokens FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), branch_id)
);

-- ========================
-- ATTENDANCE_TOKENS - Remover política pública
-- ========================
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.attendance_tokens;

CREATE POLICY "attendance_tokens_select_auth"
ON public.attendance_tokens FOR SELECT
TO authenticated
USING (
  public.has_branch_access_v2(auth.uid(), branch_id)
);