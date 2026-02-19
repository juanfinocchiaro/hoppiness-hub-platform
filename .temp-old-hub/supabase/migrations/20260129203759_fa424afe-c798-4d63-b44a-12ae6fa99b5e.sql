-- =====================================================
-- CORREGIR POLÍTICAS CON ROLES PUBLIC → AUTHENTICATED
-- =====================================================

-- ATTENDANCE_TOKENS
DROP POLICY IF EXISTS "Managers can update attendance tokens" ON public.attendance_tokens;
DROP POLICY IF EXISTS "Staff can create attendance tokens" ON public.attendance_tokens;

CREATE POLICY "attendance_tokens_update_managers"
ON public.attendance_tokens FOR UPDATE
TO authenticated
USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "attendance_tokens_insert_staff"
ON public.attendance_tokens FOR INSERT
TO authenticated
WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id));

-- BRANCHES
DROP POLICY IF EXISTS "Encargados can update their branch config" ON public.branches;
DROP POLICY IF EXISTS "Managers can update shift settings" ON public.branches;
DROP POLICY IF EXISTS "Users with branch access can view shift settings" ON public.branches;
DROP POLICY IF EXISTS "Only authenticated users with access can view branches" ON public.branches;

CREATE POLICY "branches_select_auth"
ON public.branches FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), id)
);

CREATE POLICY "branches_update_managers"
ON public.branches FOR UPDATE
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), id)
);

-- CASH_REGISTER_MOVEMENTS
DROP POLICY IF EXISTS "Admins and managers can delete movements" ON public.cash_register_movements;
DROP POLICY IF EXISTS "Staff can create movements" ON public.cash_register_movements;
DROP POLICY IF EXISTS "Staff can view branch movements" ON public.cash_register_movements;

CREATE POLICY "cash_movements_insert_staff"
ON public.cash_register_movements FOR INSERT
TO authenticated
WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "cash_movements_delete_managers"
ON public.cash_register_movements FOR DELETE
TO authenticated
USING (public.is_admin_v2(auth.uid()) OR public.is_hr_manager(auth.uid()));

-- CLOCK_ENTRIES
DROP POLICY IF EXISTS "Managers can view branch clock entries" ON public.clock_entries;
DROP POLICY IF EXISTS "Users can insert own clock entries" ON public.clock_entries;
DROP POLICY IF EXISTS "Users can view own clock entries" ON public.clock_entries;

-- Ya tenemos clock_entries_select_own_or_hr y clock_entries_insert_own

-- CUSTOMER_ADDRESSES
DROP POLICY IF EXISTS "Customers can delete own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customers can insert own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customers can update own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Staff can view all addresses" ON public.customer_addresses;

CREATE POLICY "addresses_insert_auth"
ON public.customer_addresses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c 
    WHERE c.id = customer_id AND c.user_id = auth.uid()
  )
  OR public.is_admin_v2(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles_v2 ur
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND ur.local_role IS NOT NULL
  )
);

CREATE POLICY "addresses_update_auth"
ON public.customer_addresses FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customers c 
    WHERE c.id = customer_id AND c.user_id = auth.uid()
  )
  OR public.is_admin_v2(auth.uid())
);

CREATE POLICY "addresses_delete_auth"
ON public.customer_addresses FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customers c 
    WHERE c.id = customer_id AND c.user_id = auth.uid()
  )
  OR public.is_admin_v2(auth.uid())
);

-- EMPLOYEE_PRIVATE_DETAILS
DROP POLICY IF EXISTS "Only managers can delete employee private details" ON public.employee_private_details;
DROP POLICY IF EXISTS "Only managers can insert employee private details" ON public.employee_private_details;
DROP POLICY IF EXISTS "Only managers can update employee private details" ON public.employee_private_details;
DROP POLICY IF EXISTS "Only managers can view employee private details" ON public.employee_private_details;

CREATE POLICY "employee_private_insert_hr"
ON public.employee_private_details FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_v2(auth.uid()) OR public.is_hr_manager(auth.uid()));

CREATE POLICY "employee_private_update_hr"
ON public.employee_private_details FOR UPDATE
TO authenticated
USING (public.is_admin_v2(auth.uid()) OR public.is_hr_manager(auth.uid()));

CREATE POLICY "employee_private_delete_hr"
ON public.employee_private_details FOR DELETE
TO authenticated
USING (public.is_admin_v2(auth.uid()) OR public.is_hr_manager(auth.uid()));

-- EMPLOYEE_WARNINGS
DROP POLICY IF EXISTS "Staff can manage employee warnings" ON public.employee_warnings;
DROP POLICY IF EXISTS "Staff can view employee warnings" ON public.employee_warnings;

CREATE POLICY "employee_warnings_insert_hr"
ON public.employee_warnings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_v2(auth.uid()) OR public.is_hr_manager(auth.uid()));

CREATE POLICY "employee_warnings_update_hr"
ON public.employee_warnings FOR UPDATE
TO authenticated
USING (public.is_admin_v2(auth.uid()) OR public.is_hr_manager(auth.uid()));

-- EMPLOYEES
DROP POLICY IF EXISTS "Managers can view branch employees" ON public.employees;
DROP POLICY IF EXISTS "Staff can manage branch employees" ON public.employees;

CREATE POLICY "employees_insert_hr"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_v2(auth.uid()) 
  OR (public.is_hr_manager(auth.uid()) AND public.has_branch_access_v2(auth.uid(), branch_id))
);

CREATE POLICY "employees_update_hr"
ON public.employees FOR UPDATE
TO authenticated
USING (
  public.is_admin_v2(auth.uid()) 
  OR (public.is_hr_manager(auth.uid()) AND public.has_branch_access_v2(auth.uid(), branch_id))
);

-- PAYROLL_ENTRIES
DROP POLICY IF EXISTS "Managers can manage payroll entries" ON public.payroll_entries;

CREATE POLICY "payroll_insert_hr"
ON public.payroll_entries FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_v2(auth.uid()) OR public.is_financial_manager(auth.uid()));

CREATE POLICY "payroll_update_hr"
ON public.payroll_entries FOR UPDATE
TO authenticated
USING (public.is_admin_v2(auth.uid()) OR public.is_financial_manager(auth.uid()));

-- SALARY_ADVANCES
DROP POLICY IF EXISTS "Managers can insert advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Managers can update advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Managers can view branch advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Users can view own advances" ON public.salary_advances;

CREATE POLICY "advances_insert_hr"
ON public.salary_advances FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_v2(auth.uid()) 
  OR (public.is_hr_manager(auth.uid()) AND public.has_branch_access_v2(auth.uid(), branch_id))
);

CREATE POLICY "advances_update_hr"
ON public.salary_advances FOR UPDATE
TO authenticated
USING (
  public.is_admin_v2(auth.uid()) 
  OR (public.is_hr_manager(auth.uid()) AND public.has_branch_access_v2(auth.uid(), branch_id))
);