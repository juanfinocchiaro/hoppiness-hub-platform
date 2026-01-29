-- =====================================================
-- POLÍTICAS RLS COMPLETAS - PARTE 1
-- =====================================================

-- ========================
-- 1. EMPLOYEES - Datos personales de empleados
-- ========================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR managers can view employees" ON public.employees;
DROP POLICY IF EXISTS "Employees visible to HR managers with branch access" ON public.employees;

CREATE POLICY "employees_select_hr_only"
ON public.employees FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR (
    public.is_hr_manager(auth.uid())
    AND public.has_branch_access_v2(auth.uid(), branch_id)
  )
);

-- ========================
-- 2. PROFILES - Perfiles de usuarios
-- ========================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile or HR managers" ON public.profiles;
DROP POLICY IF EXISTS "Profiles visible to owners or HR" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_select_own_or_hr"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR public.is_hr_manager(auth.uid())
);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ========================
-- 3. CUSTOMERS - Datos de clientes
-- ========================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers visible to authenticated staff" ON public.customers;

CREATE POLICY "customers_select_staff"
ON public.customers FOR SELECT
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
-- 4. ORDERS - Pedidos
-- ========================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders visible to owners or branch staff" ON public.orders;

CREATE POLICY "orders_select_owner_or_staff"
ON public.orders FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), branch_id)
);

-- ========================
-- 5. SUPPLIERS - Proveedores
-- ========================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Suppliers visible to purchasing managers" ON public.suppliers;

CREATE POLICY "suppliers_select_managers"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_financial_manager(auth.uid())
);

-- ========================
-- 6. TRANSACTIONS - Transacciones financieras
-- ========================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transactions visible to financial managers" ON public.transactions;

CREATE POLICY "transactions_select_financial"
ON public.transactions FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_financial_manager(auth.uid())
);

-- ========================
-- 7. SUPPLIER_INVOICES - Facturas de proveedores
-- ========================
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invoices visible to financial managers" ON public.supplier_invoices;

CREATE POLICY "supplier_invoices_select_financial"
ON public.supplier_invoices FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_financial_manager(auth.uid())
);

-- ========================
-- 8. SALARY_ADVANCES - Adelantos de sueldo
-- ========================
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Advances visible to owner or HR" ON public.salary_advances;

CREATE POLICY "salary_advances_select_own_or_hr"
ON public.salary_advances FOR SELECT
TO authenticated
USING (
  employee_id = auth.uid()
  OR public.is_admin_v2(auth.uid())
  OR (
    public.is_hr_manager(auth.uid())
    AND public.has_branch_access_v2(auth.uid(), branch_id)
  )
);

-- ========================
-- 9. PAYROLL_ENTRIES - Nómina
-- ========================
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payroll visible to HR admins" ON public.payroll_entries;

CREATE POLICY "payroll_entries_select_hr"
ON public.payroll_entries FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR public.is_financial_manager(auth.uid())
);

-- ========================
-- 10. CONTACT_MESSAGES - Mensajes de contacto
-- ========================
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Contact messages viewable by admin" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact messages insertable by public" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;

CREATE POLICY "contact_messages_insert_public"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "contact_messages_select_admin"
ON public.contact_messages FOR SELECT
TO authenticated
USING (
  public.is_admin_v2(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND ur.brand_role IN ('superadmin', 'coordinador')
  )
);