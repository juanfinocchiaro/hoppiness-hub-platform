-- =====================================================
-- POLÍTICAS RLS COMPLETAS - PARTE 2 (CORREGIDA)
-- =====================================================

-- ========================
-- 11. ATTENDANCE_RECORDS - Registros de asistencia
-- ========================
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attendance visible to owner or HR" ON public.attendance_records;

CREATE POLICY "attendance_records_select_own_or_hr"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR (
    public.is_hr_manager(auth.uid())
    AND public.has_branch_access_v2(auth.uid(), branch_id)
  )
);

-- ========================
-- 12. EMPLOYEE_DOCUMENTS - Documentos de empleados
-- ========================
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Employee documents visible to HR" ON public.employee_documents;

CREATE POLICY "employee_documents_select_hr"
ON public.employee_documents FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

-- ========================
-- 13. WARNINGS - Apercibimientos (usa user_id, no employee_id)
-- ========================
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Warnings visible to owner or HR" ON public.warnings;
DROP POLICY IF EXISTS "Employees can view own warnings" ON public.warnings;
DROP POLICY IF EXISTS "Managers can manage warnings" ON public.warnings;

CREATE POLICY "warnings_select_own_or_hr"
ON public.warnings FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

CREATE POLICY "warnings_insert_hr"
ON public.warnings FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

CREATE POLICY "warnings_update_hr"
ON public.warnings FOR UPDATE
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

-- ========================
-- 14. FINANCE_ACCOUNTS - Cuentas financieras
-- ========================
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finance accounts visible to financial managers" ON public.finance_accounts;

CREATE POLICY "finance_accounts_select_financial"
ON public.finance_accounts FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_financial_manager(auth.uid())
);

-- ========================
-- 15. LOANS - Préstamos
-- ========================
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Loans visible to financial managers" ON public.loans;

CREATE POLICY "loans_select_financial"
ON public.loans FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_financial_manager(auth.uid())
);

-- ========================
-- 16. TAX_OBLIGATIONS - Obligaciones fiscales
-- ========================
ALTER TABLE public.tax_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tax obligations visible to financial managers" ON public.tax_obligations;

CREATE POLICY "tax_obligations_select_financial"
ON public.tax_obligations FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_financial_manager(auth.uid())
);

-- ========================
-- 17. BRANCH_CUSTOMER_ACCOUNTS - Cuentas corrientes
-- ========================
ALTER TABLE public.branch_customer_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer accounts visible to staff" ON public.branch_customer_accounts;

CREATE POLICY "branch_customer_accounts_select_staff"
ON public.branch_customer_accounts FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), branch_id)
);

-- ========================
-- 18. SCANNED_DOCUMENTS - Documentos escaneados
-- ========================
ALTER TABLE public.scanned_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Scanned documents visible to staff" ON public.scanned_documents;

CREATE POLICY "scanned_documents_select_staff"
ON public.scanned_documents FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), branch_id)
);

-- ========================
-- 19. AUDIT_LOGS - Solo lectura para superadmin
-- ========================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by superadmin" ON public.audit_logs;

CREATE POLICY "audit_logs_select_superadmin"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin_v2(auth.uid()));

-- ========================
-- 20. STOCK_MOVEMENTS - Movimientos de stock (solo managers)
-- ========================
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stock movements visible to branch staff" ON public.stock_movements;

CREATE POLICY "stock_movements_select_managers"
ON public.stock_movements FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR (
    public.has_branch_access_v2(auth.uid(), branch_id)
    AND public.is_hr_manager(auth.uid())
  )
);

-- ========================
-- 21. CASHIER_DISCREPANCY_HISTORY - Solo managers
-- ========================
ALTER TABLE public.cashier_discrepancy_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Discrepancies visible to branch staff" ON public.cashier_discrepancy_history;

CREATE POLICY "cashier_discrepancy_select_managers"
ON public.cashier_discrepancy_history FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR (
    public.has_branch_access_v2(auth.uid(), branch_id)
    AND public.is_hr_manager(auth.uid())
  )
);