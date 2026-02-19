
-- ============================================
-- PART 2: REMAINING TABLES
-- ============================================

-- ============================================
-- EMPLOYEE_DOCUMENTS TABLE
-- ============================================
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee documents viewable by HR" ON public.employee_documents;
CREATE POLICY "Employee documents viewable by HR"
ON public.employee_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
);

DROP POLICY IF EXISTS "HR can manage employee documents" ON public.employee_documents;
CREATE POLICY "HR can manage employee documents"
ON public.employee_documents FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
);

-- ============================================
-- SUPPLIER_PAYMENTS TABLE
-- ============================================
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supplier payments viewable by financial staff" ON public.supplier_payments;
CREATE POLICY "Supplier payments viewable by financial staff"
ON public.supplier_payments FOR SELECT
TO authenticated
USING (public.has_financial_access(branch_id));

DROP POLICY IF EXISTS "Financial staff can manage supplier payments" ON public.supplier_payments;
CREATE POLICY "Financial staff can manage supplier payments"
ON public.supplier_payments FOR ALL
TO authenticated
USING (public.has_financial_access(branch_id))
WITH CHECK (public.has_financial_access(branch_id));

-- ============================================
-- PAYROLL_ENTRIES TABLE (via employee -> branch)
-- ============================================
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payroll viewable by HR managers" ON public.payroll_entries;
CREATE POLICY "Payroll viewable by HR managers"
ON public.payroll_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
);

DROP POLICY IF EXISTS "HR can manage payroll" ON public.payroll_entries;
CREATE POLICY "HR can manage payroll"
ON public.payroll_entries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
);

-- ============================================
-- EMPLOYEE_WARNINGS TABLE
-- ============================================
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warnings viewable by HR" ON public.employee_warnings;
CREATE POLICY "Warnings viewable by HR"
ON public.employee_warnings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
);

DROP POLICY IF EXISTS "HR can manage warnings" ON public.employee_warnings;
CREATE POLICY "HR can manage warnings"
ON public.employee_warnings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id 
    AND public.has_hr_access(e.branch_id)
  )
);

-- ============================================
-- SUPPLIER_INVOICES TABLE
-- ============================================
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supplier invoices viewable by financial staff" ON public.supplier_invoices;
CREATE POLICY "Supplier invoices viewable by financial staff"
ON public.supplier_invoices FOR SELECT
TO authenticated
USING (public.has_financial_access(branch_id));

DROP POLICY IF EXISTS "Financial staff can manage supplier invoices" ON public.supplier_invoices;
CREATE POLICY "Financial staff can manage supplier invoices"
ON public.supplier_invoices FOR ALL
TO authenticated
USING (public.has_financial_access(branch_id))
WITH CHECK (public.has_financial_access(branch_id));

-- ============================================
-- LOANS TABLE
-- ============================================
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Loans viewable by financial managers" ON public.loans;
CREATE POLICY "Loans viewable by financial managers"
ON public.loans FOR SELECT
TO authenticated
USING (public.has_financial_access(branch_id));

DROP POLICY IF EXISTS "Financial managers can manage loans" ON public.loans;
CREATE POLICY "Financial managers can manage loans"
ON public.loans FOR ALL
TO authenticated
USING (public.has_financial_access(branch_id))
WITH CHECK (public.has_financial_access(branch_id));

-- ============================================
-- PAYMENT_PLANS TABLE
-- ============================================
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payment plans viewable by financial staff" ON public.payment_plans;
CREATE POLICY "Payment plans viewable by financial staff"
ON public.payment_plans FOR SELECT
TO authenticated
USING (public.has_financial_access(branch_id));

DROP POLICY IF EXISTS "Financial staff can manage payment plans" ON public.payment_plans;
CREATE POLICY "Financial staff can manage payment plans"
ON public.payment_plans FOR ALL
TO authenticated
USING (public.has_financial_access(branch_id))
WITH CHECK (public.has_financial_access(branch_id));

-- ============================================
-- BRANCHES TABLE
-- ============================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branches basic info publicly readable" ON public.branches;
CREATE POLICY "Branches basic info publicly readable"
ON public.branches FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Staff can manage branches" ON public.branches;
CREATE POLICY "Staff can manage branches"
ON public.branches FOR UPDATE
TO authenticated
USING (public.user_has_branch_access(id));

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transactions viewable by financial staff" ON public.transactions;
CREATE POLICY "Transactions viewable by financial staff"
ON public.transactions FOR SELECT
TO authenticated
USING (public.has_financial_access(branch_id));

DROP POLICY IF EXISTS "Financial staff can manage transactions" ON public.transactions;
CREATE POLICY "Financial staff can manage transactions"
ON public.transactions FOR ALL
TO authenticated
USING (public.has_financial_access(branch_id))
WITH CHECK (public.has_financial_access(branch_id));

-- ============================================
-- SALARY_ADVANCES TABLE
-- ============================================
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salary advances viewable by HR" ON public.salary_advances;
CREATE POLICY "Salary advances viewable by HR"
ON public.salary_advances FOR SELECT
TO authenticated
USING (public.has_hr_access(branch_id));

DROP POLICY IF EXISTS "HR can manage salary advances" ON public.salary_advances;
CREATE POLICY "HR can manage salary advances"
ON public.salary_advances FOR ALL
TO authenticated
USING (public.has_hr_access(branch_id))
WITH CHECK (public.has_hr_access(branch_id));

-- ============================================
-- ATTENDANCE_RECORDS TABLE
-- ============================================
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendance viewable by user or HR" ON public.attendance_records;
CREATE POLICY "Attendance viewable by user or HR"
ON public.attendance_records FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_hr_access(branch_id));

DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_records;
CREATE POLICY "Users can insert own attendance"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "HR can manage attendance" ON public.attendance_records;
CREATE POLICY "HR can manage attendance"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (public.has_hr_access(branch_id));

-- ============================================
-- CUSTOMER_ADDRESSES TABLE
-- ============================================
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own addresses" ON public.customer_addresses;
CREATE POLICY "Customers can view own addresses"
ON public.customer_addresses FOR SELECT
TO authenticated
USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  OR public.is_staff()
);

DROP POLICY IF EXISTS "Customers can manage own addresses" ON public.customer_addresses;
CREATE POLICY "Customers can manage own addresses"
ON public.customer_addresses FOR ALL
TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- ============================================
-- BRANCH_CUSTOMER_ACCOUNTS TABLE
-- ============================================
ALTER TABLE public.branch_customer_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer accounts viewable by branch staff" ON public.branch_customer_accounts;
CREATE POLICY "Customer accounts viewable by branch staff"
ON public.branch_customer_accounts FOR SELECT
TO authenticated
USING (
  public.user_has_branch_access(branch_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Branch staff can manage accounts" ON public.branch_customer_accounts;
CREATE POLICY "Branch staff can manage accounts"
ON public.branch_customer_accounts FOR ALL
TO authenticated
USING (public.user_has_branch_access(branch_id))
WITH CHECK (public.user_has_branch_access(branch_id));
