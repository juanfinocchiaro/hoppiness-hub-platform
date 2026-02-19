
-- =====================================================
-- SECURITY HARDENING MIGRATION - PART 2: FINANCIAL TABLES
-- =====================================================

-- =====================================================
-- PAYROLL_ENTRIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "payroll_entries_select" ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_entries_insert" ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_entries_update" ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_entries_financial_select" ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_entries_financial_insert" ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_entries_financial_update" ON public.payroll_entries;

CREATE POLICY "payroll_entries_financial_select"
  ON public.payroll_entries FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid()
      AND is_active = true
      AND brand_role IN ('superadmin', 'contador_marca')
    )
  );

CREATE POLICY "payroll_entries_financial_insert"
  ON public.payroll_entries FOR INSERT
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid()
      AND is_active = true
      AND brand_role IN ('superadmin', 'contador_marca')
    )
  );

CREATE POLICY "payroll_entries_financial_update"
  ON public.payroll_entries FOR UPDATE
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid()
      AND is_active = true
      AND brand_role IN ('superadmin', 'contador_marca')
    )
  );

-- =====================================================
-- CASH_REGISTER_MOVEMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "cash_register_movements_select" ON public.cash_register_movements;
DROP POLICY IF EXISTS "cash_register_movements_insert" ON public.cash_register_movements;
DROP POLICY IF EXISTS "cash_register_movements_update" ON public.cash_register_movements;
DROP POLICY IF EXISTS "crm_cashier_select" ON public.cash_register_movements;
DROP POLICY IF EXISTS "crm_cashier_insert" ON public.cash_register_movements;
DROP POLICY IF EXISTS "crm_cashier_update" ON public.cash_register_movements;

CREATE POLICY "crm_cashier_select"
  ON public.cash_register_movements FOR SELECT
  USING (public.is_cashier_for_branch(auth.uid(), branch_id));

CREATE POLICY "crm_cashier_insert"
  ON public.cash_register_movements FOR INSERT
  WITH CHECK (public.is_cashier_for_branch(auth.uid(), branch_id));

CREATE POLICY "crm_cashier_update"
  ON public.cash_register_movements FOR UPDATE
  USING (public.is_financial_for_branch(auth.uid(), branch_id));

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_financial_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_financial_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_financial_update" ON public.transactions;

CREATE POLICY "transactions_financial_select"
  ON public.transactions FOR SELECT
  USING (public.is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "transactions_financial_insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "transactions_financial_update"
  ON public.transactions FOR UPDATE
  USING (public.is_financial_for_branch(auth.uid(), branch_id));

-- =====================================================
-- SUPPLIER_INVOICES TABLE
-- =====================================================
DROP POLICY IF EXISTS "supplier_invoices_select" ON public.supplier_invoices;
DROP POLICY IF EXISTS "supplier_invoices_insert" ON public.supplier_invoices;
DROP POLICY IF EXISTS "supplier_invoices_update" ON public.supplier_invoices;
DROP POLICY IF EXISTS "supplier_invoices_financial_select" ON public.supplier_invoices;
DROP POLICY IF EXISTS "supplier_invoices_financial_insert" ON public.supplier_invoices;
DROP POLICY IF EXISTS "supplier_invoices_financial_update" ON public.supplier_invoices;

CREATE POLICY "supplier_invoices_financial_select"
  ON public.supplier_invoices FOR SELECT
  USING (public.is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "supplier_invoices_financial_insert"
  ON public.supplier_invoices FOR INSERT
  WITH CHECK (public.is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "supplier_invoices_financial_update"
  ON public.supplier_invoices FOR UPDATE
  USING (public.is_financial_for_branch(auth.uid(), branch_id));

-- =====================================================
-- BRANCHES TABLE
-- =====================================================
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_update" ON public.branches;
DROP POLICY IF EXISTS "branches_public_read" ON public.branches;
DROP POLICY IF EXISTS "branches_staff_read" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_write" ON public.branches;
DROP POLICY IF EXISTS "branches_authenticated_select" ON public.branches;
DROP POLICY IF EXISTS "branches_anon_select" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_update" ON public.branches;

CREATE POLICY "branches_authenticated_select"
  ON public.branches FOR SELECT TO authenticated
  USING (
    public.has_branch_access(auth.uid(), id)
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "branches_anon_select"
  ON public.branches FOR SELECT TO anon
  USING (public_status IN ('active', 'coming_soon'));

CREATE POLICY "branches_admin_insert"
  ON public.branches FOR INSERT
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "branches_admin_update"
  ON public.branches FOR UPDATE
  USING (public.is_superadmin(auth.uid()));

-- =====================================================
-- ORDERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_select" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;

CREATE POLICY "orders_customer_select"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders_staff_select"
  ON public.orders FOR SELECT
  USING (public.is_cashier_for_branch(auth.uid(), branch_id));

CREATE POLICY "orders_staff_insert"
  ON public.orders FOR INSERT
  WITH CHECK (public.is_cashier_for_branch(auth.uid(), branch_id) OR auth.uid() = user_id);

CREATE POLICY "orders_staff_update"
  ON public.orders FOR UPDATE
  USING (public.is_cashier_for_branch(auth.uid(), branch_id));

-- =====================================================
-- ATTENDANCE_RECORDS TABLE
-- =====================================================
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_own_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_hr_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert_new" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_hr_update" ON public.attendance_records;

CREATE POLICY "attendance_records_own_select"
  ON public.attendance_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "attendance_records_hr_select"
  ON public.attendance_records FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "attendance_records_insert_new"
  ON public.attendance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "attendance_records_hr_update"
  ON public.attendance_records FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- =====================================================
-- EMPLOYEE_WARNINGS TABLE (uses employee_id)
-- =====================================================
DROP POLICY IF EXISTS "employee_warnings_select" ON public.employee_warnings;
DROP POLICY IF EXISTS "employee_warnings_insert" ON public.employee_warnings;
DROP POLICY IF EXISTS "employee_warnings_update" ON public.employee_warnings;
DROP POLICY IF EXISTS "employee_warnings_own_select" ON public.employee_warnings;
DROP POLICY IF EXISTS "employee_warnings_hr_select" ON public.employee_warnings;
DROP POLICY IF EXISTS "employee_warnings_hr_insert" ON public.employee_warnings;
DROP POLICY IF EXISTS "employee_warnings_hr_update" ON public.employee_warnings;

CREATE POLICY "employee_warnings_hr_select"
  ON public.employee_warnings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_warnings.employee_id
      AND public.is_hr_for_branch(auth.uid(), e.branch_id)
    )
  );

CREATE POLICY "employee_warnings_hr_insert"
  ON public.employee_warnings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_warnings.employee_id
      AND public.is_hr_for_branch(auth.uid(), e.branch_id)
    )
  );

CREATE POLICY "employee_warnings_hr_update"
  ON public.employee_warnings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_warnings.employee_id
      AND public.is_hr_for_branch(auth.uid(), e.branch_id)
    )
  );

-- =====================================================
-- WARNINGS TABLE (has user_id)
-- =====================================================
DROP POLICY IF EXISTS "warnings_select" ON public.warnings;
DROP POLICY IF EXISTS "warnings_insert" ON public.warnings;
DROP POLICY IF EXISTS "warnings_update" ON public.warnings;
DROP POLICY IF EXISTS "warnings_own_select" ON public.warnings;
DROP POLICY IF EXISTS "warnings_hr_select" ON public.warnings;
DROP POLICY IF EXISTS "warnings_hr_insert" ON public.warnings;
DROP POLICY IF EXISTS "warnings_hr_update" ON public.warnings;

CREATE POLICY "warnings_own_select"
  ON public.warnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "warnings_hr_select"
  ON public.warnings FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "warnings_hr_insert"
  ON public.warnings FOR INSERT
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "warnings_hr_update"
  ON public.warnings FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));
