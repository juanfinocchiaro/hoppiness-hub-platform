
-- ============================================
-- PART 1: HELPER FUNCTIONS
-- ============================================

-- Helper function to check if user has access to a branch
CREATE OR REPLACE FUNCTION public.user_has_branch_access(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (
      p_branch_id = ANY(branch_ids)
      OR branch_ids IS NULL
      OR array_length(branch_ids, 1) IS NULL
    )
  )
$$;

-- Helper function to check if user is staff (any role)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = auth.uid()
    AND is_active = true
  )
$$;

-- Helper function to check if user has financial permissions
CREATE OR REPLACE FUNCTION public.has_financial_access(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (
      brand_role IN ('superadmin', 'coordinador', 'contador_marca')
      OR (p_branch_id = ANY(branch_ids) AND local_role IN ('franquiciado', 'encargado', 'contador_local'))
      OR (branch_ids IS NULL AND brand_role IS NOT NULL)
    )
  )
$$;

-- Helper function to check if user has HR permissions
CREATE OR REPLACE FUNCTION public.has_hr_access(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (
      brand_role IN ('superadmin', 'coordinador')
      OR (p_branch_id = ANY(branch_ids) AND local_role IN ('franquiciado', 'encargado'))
      OR (branch_ids IS NULL AND brand_role IS NOT NULL)
    )
  )
$$;

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers are viewable by staff" ON public.customers;
CREATE POLICY "Customers are viewable by staff"
ON public.customers FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can insert customers" ON public.customers;
CREATE POLICY "Staff can insert customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
CREATE POLICY "Staff can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (public.is_staff());

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees viewable by branch managers" ON public.employees;
CREATE POLICY "Employees viewable by branch managers"
ON public.employees FOR SELECT
TO authenticated
USING (public.has_hr_access(branch_id));

DROP POLICY IF EXISTS "HR can manage employees" ON public.employees;
CREATE POLICY "HR can manage employees"
ON public.employees FOR ALL
TO authenticated
USING (public.has_hr_access(branch_id))
WITH CHECK (public.has_hr_access(branch_id));

-- ============================================
-- ORDERS TABLE
-- ============================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders viewable by branch staff" ON public.orders;
CREATE POLICY "Orders viewable by branch staff"
ON public.orders FOR SELECT
TO authenticated
USING (
  public.user_has_branch_access(branch_id)
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff can manage orders" ON public.orders;
CREATE POLICY "Staff can manage orders"
ON public.orders FOR ALL
TO authenticated
USING (public.user_has_branch_access(branch_id))
WITH CHECK (public.user_has_branch_access(branch_id));

-- ============================================
-- CONTACT_MESSAGES TABLE
-- ============================================
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contact messages viewable by admin staff" ON public.contact_messages;
CREATE POLICY "Contact messages viewable by admin staff"
ON public.contact_messages FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update contact messages" ON public.contact_messages;
CREATE POLICY "Staff can update contact messages"
ON public.contact_messages FOR UPDATE
TO authenticated
USING (public.is_staff());

-- ============================================
-- SCANNED_DOCUMENTS TABLE
-- ============================================
ALTER TABLE public.scanned_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scanned documents viewable by branch staff" ON public.scanned_documents;
CREATE POLICY "Scanned documents viewable by branch staff"
ON public.scanned_documents FOR SELECT
TO authenticated
USING (public.user_has_branch_access(branch_id));

DROP POLICY IF EXISTS "Staff can manage scanned documents" ON public.scanned_documents;
CREATE POLICY "Staff can manage scanned documents"
ON public.scanned_documents FOR ALL
TO authenticated
USING (public.user_has_branch_access(branch_id))
WITH CHECK (public.user_has_branch_access(branch_id));

-- ============================================
-- PROFILES TABLE
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Profiles can be created on signup" ON public.profiles;
CREATE POLICY "Profiles can be created on signup"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- CASH_REGISTER_MOVEMENTS TABLE
-- ============================================
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cash movements viewable by branch staff" ON public.cash_register_movements;
CREATE POLICY "Cash movements viewable by branch staff"
ON public.cash_register_movements FOR SELECT
TO authenticated
USING (public.user_has_branch_access(branch_id));

DROP POLICY IF EXISTS "Staff can manage cash movements" ON public.cash_register_movements;
CREATE POLICY "Staff can manage cash movements"
ON public.cash_register_movements FOR ALL
TO authenticated
USING (public.user_has_branch_access(branch_id))
WITH CHECK (public.user_has_branch_access(branch_id));

-- ============================================
-- TAX_OBLIGATIONS TABLE
-- ============================================
ALTER TABLE public.tax_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tax obligations viewable by financial staff" ON public.tax_obligations;
CREATE POLICY "Tax obligations viewable by financial staff"
ON public.tax_obligations FOR SELECT
TO authenticated
USING (public.has_financial_access(branch_id));

DROP POLICY IF EXISTS "Financial staff can manage tax obligations" ON public.tax_obligations;
CREATE POLICY "Financial staff can manage tax obligations"
ON public.tax_obligations FOR ALL
TO authenticated
USING (public.has_financial_access(branch_id))
WITH CHECK (public.has_financial_access(branch_id));
