
-- ============================================
-- SECURITY HARDENING MIGRATION
-- Fixes 10 critical data exposure vulnerabilities
-- ============================================

-- 1. BRANCHES TABLE - Remove public access, use branches_public view
DROP POLICY IF EXISTS "Branches basic info publicly readable" ON branches;
DROP POLICY IF EXISTS "Anyone can view active branches" ON branches;

-- Create strict policy for branches
CREATE POLICY "Only authenticated users with access can view branches"
ON branches FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid()) 
  OR has_branch_access_v2(auth.uid(), id)
);

-- 2. PROFILES TABLE - Restrict to own profile or HR managers
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON profiles;

CREATE POLICY "Users view own profile or HR managers view staff"
ON profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role IN ('superadmin', 'coordinador')
      OR ur.local_role IN ('encargado', 'franquiciado')
    )
  )
);

-- 3. EMPLOYEES TABLE - Restrict to HR managers only
DROP POLICY IF EXISTS "Employees viewable by branch staff" ON employees;
DROP POLICY IF EXISTS "Employees viewable by branch managers" ON employees;

CREATE POLICY "Only HR managers can view employees"
ON employees FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role IN ('superadmin', 'coordinador')
      OR (ur.local_role IN ('encargado', 'franquiciado') AND employees.branch_id = ANY(ur.branch_ids))
    )
  )
);

-- 4. CUSTOMERS TABLE - Restrict to staff with order permissions
DROP POLICY IF EXISTS "Anyone authenticated can view customers" ON customers;
DROP POLICY IF EXISTS "Customers are viewable by staff" ON customers;

CREATE POLICY "Staff with order permissions can view customers"
ON customers FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND ur.local_role IS NOT NULL
  )
);

-- 5. ORDERS TABLE - Strengthen protection
DROP POLICY IF EXISTS "Customers can view orders with valid token" ON orders;
DROP POLICY IF EXISTS "Orders viewable by branch staff" ON orders;

CREATE POLICY "Users can view own orders or staff with access"
ON orders FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR orders.branch_id = ANY(ur.branch_ids)
    )
  )
);

-- 6. TRANSACTIONS TABLE - Financial managers only
DROP POLICY IF EXISTS "Staff can view branch transactions" ON transactions;

CREATE POLICY "Financial managers can view transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role IN ('superadmin', 'contador_marca')
      OR (ur.local_role IN ('encargado', 'franquiciado', 'contador_local') AND transactions.branch_id = ANY(ur.branch_ids))
    )
  )
);

-- 7. SUPPLIERS TABLE - Purchasing managers only
DROP POLICY IF EXISTS "Staff can view suppliers" ON suppliers;

CREATE POLICY "Purchasing managers can view suppliers"
ON suppliers FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR scope = 'brand'
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role IN ('superadmin', 'coordinador', 'contador_marca')
      OR (ur.local_role IN ('encargado', 'franquiciado', 'contador_local') AND suppliers.branch_id = ANY(ur.branch_ids))
    )
  )
);

-- 8. SUPPLIER_INVOICES TABLE - Financial managers only
DROP POLICY IF EXISTS "Users can view supplier invoices for their branches" ON supplier_invoices;

CREATE POLICY "Financial managers can view supplier invoices"
ON supplier_invoices FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role IN ('superadmin', 'contador_marca')
      OR (ur.local_role IN ('encargado', 'franquiciado', 'contador_local') AND supplier_invoices.branch_id = ANY(ur.branch_ids))
    )
  )
);

-- 9. PAYROLL_ENTRIES TABLE - HR/Payroll admins only
DROP POLICY IF EXISTS "Staff can view payroll entries" ON payroll_entries;

CREATE POLICY "HR managers can view payroll entries"
ON payroll_entries FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur, payroll_periods pp, employees e
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND pp.id = payroll_entries.period_id
    AND e.id = payroll_entries.employee_id
    AND (
      ur.brand_role IN ('superadmin', 'contador_marca')
      OR (ur.local_role IN ('encargado', 'franquiciado') AND pp.branch_id = ANY(ur.branch_ids))
    )
  )
);

-- 10. SALARY_ADVANCES TABLE - HR managers or own advances
DROP POLICY IF EXISTS "Branch access for advances" ON salary_advances;
DROP POLICY IF EXISTS "Salary advances viewable by HR" ON salary_advances;

CREATE POLICY "Users view own or HR managers view all branch advances"
ON salary_advances FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role IN ('superadmin', 'contador_marca')
      OR (ur.local_role IN ('encargado', 'franquiciado', 'contador_local') AND salary_advances.branch_id = ANY(ur.branch_ids))
    )
  )
);

-- Fix the mutable search_path warning by updating the function
CREATE OR REPLACE FUNCTION public.update_daily_sales_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
