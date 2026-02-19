
-- =====================================================
-- SECURITY HARDENING MIGRATION - PART 1: FUNCTIONS
-- =====================================================

-- Function to check if user is HR manager with branch access
CREATE OR REPLACE FUNCTION public.is_hr_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id
    AND is_active = true
    AND (
      brand_role = 'superadmin'
      OR (
        local_role IN ('franquiciado', 'encargado')
        AND _branch_id = ANY(branch_ids)
      )
    )
  )
$$;

-- Function to check if user is financial manager with branch access
CREATE OR REPLACE FUNCTION public.is_financial_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id
    AND is_active = true
    AND (
      brand_role IN ('superadmin', 'contador_marca')
      OR (
        local_role IN ('franquiciado', 'encargado', 'contador_local')
        AND _branch_id = ANY(branch_ids)
      )
    )
  )
$$;

-- Function to check if user has access to branch
CREATE OR REPLACE FUNCTION public.is_cashier_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Function to check if user is staff member
CREATE OR REPLACE FUNCTION public.is_staff_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id
    AND is_active = true
  )
$$;

-- =====================================================
-- PROFILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "HR managers can view employees in their branches" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_hr_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_hr_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_own_select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_hr_select"
  ON public.profiles FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles_v2 ur_target
      WHERE ur_target.user_id = profiles.user_id
      AND ur_target.is_active = true
      AND EXISTS (
        SELECT 1 FROM public.user_roles_v2 ur_viewer
        WHERE ur_viewer.user_id = auth.uid()
        AND ur_viewer.is_active = true
        AND (
          ur_viewer.brand_role IN ('superadmin', 'coordinador')
          OR (
            ur_viewer.local_role IN ('franquiciado', 'encargado')
            AND ur_target.branch_ids && ur_viewer.branch_ids
          )
        )
      )
    )
  );

CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;
DROP POLICY IF EXISTS "Users can view their employee record" ON public.employees;
DROP POLICY IF EXISTS "HR can view employees in their branches" ON public.employees;
DROP POLICY IF EXISTS "employees_own_select" ON public.employees;
DROP POLICY IF EXISTS "employees_hr_select" ON public.employees;
DROP POLICY IF EXISTS "employees_hr_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_hr_update" ON public.employees;
DROP POLICY IF EXISTS "employees_hr_delete" ON public.employees;

CREATE POLICY "employees_hr_select"
  ON public.employees FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "employees_hr_insert"
  ON public.employees FOR INSERT
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "employees_hr_update"
  ON public.employees FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "employees_hr_delete"
  ON public.employees FOR DELETE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- =====================================================
-- EMPLOYEE_DATA TABLE
-- =====================================================
DROP POLICY IF EXISTS "employee_data_select" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_insert" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_update" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_delete" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_own_select" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_hr_select" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_hr_insert" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_hr_update" ON public.employee_data;

CREATE POLICY "employee_data_own_select"
  ON public.employee_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "employee_data_hr_select"
  ON public.employee_data FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "employee_data_hr_insert"
  ON public.employee_data FOR INSERT
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "employee_data_hr_update"
  ON public.employee_data FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- =====================================================
-- EMPLOYEE_PRIVATE_DETAILS TABLE
-- =====================================================
DROP POLICY IF EXISTS "employee_private_details_select" ON public.employee_private_details;
DROP POLICY IF EXISTS "employee_private_details_insert" ON public.employee_private_details;
DROP POLICY IF EXISTS "employee_private_details_update" ON public.employee_private_details;
DROP POLICY IF EXISTS "employee_private_details_own_select" ON public.employee_private_details;
DROP POLICY IF EXISTS "employee_private_details_hr_select" ON public.employee_private_details;
DROP POLICY IF EXISTS "employee_private_details_hr_insert" ON public.employee_private_details;
DROP POLICY IF EXISTS "employee_private_details_hr_update" ON public.employee_private_details;

CREATE POLICY "employee_private_details_hr_select"
  ON public.employee_private_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_private_details.employee_id
      AND public.is_hr_for_branch(auth.uid(), e.branch_id)
    )
  );

CREATE POLICY "employee_private_details_hr_insert"
  ON public.employee_private_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_private_details.employee_id
      AND public.is_hr_for_branch(auth.uid(), e.branch_id)
    )
  );

CREATE POLICY "employee_private_details_hr_update"
  ON public.employee_private_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_private_details.employee_id
      AND public.is_hr_for_branch(auth.uid(), e.branch_id)
    )
  );

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_own_select" ON public.customers;
DROP POLICY IF EXISTS "customers_staff_select" ON public.customers;
DROP POLICY IF EXISTS "customers_staff_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_staff_update" ON public.customers;

CREATE POLICY "customers_own_select"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "customers_staff_select"
  ON public.customers FOR SELECT
  USING (public.is_staff_member(auth.uid()));

CREATE POLICY "customers_staff_insert"
  ON public.customers FOR INSERT
  WITH CHECK (public.is_staff_member(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "customers_staff_update"
  ON public.customers FOR UPDATE
  USING (public.is_staff_member(auth.uid()) OR auth.uid() = user_id);

-- =====================================================
-- CUSTOMER_ADDRESSES TABLE
-- =====================================================
DROP POLICY IF EXISTS "customer_addresses_select" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_insert" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_update" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_own_select" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_staff_select" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_insert_new" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_update_new" ON public.customer_addresses;

CREATE POLICY "customer_addresses_own_select"
  ON public.customer_addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_addresses.customer_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "customer_addresses_staff_select"
  ON public.customer_addresses FOR SELECT
  USING (public.is_staff_member(auth.uid()));

CREATE POLICY "customer_addresses_insert_new"
  ON public.customer_addresses FOR INSERT
  WITH CHECK (
    public.is_staff_member(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_addresses.customer_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "customer_addresses_update_new"
  ON public.customer_addresses FOR UPDATE
  USING (
    public.is_staff_member(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_addresses.customer_id
      AND c.user_id = auth.uid()
    )
  );

-- =====================================================
-- SALARY_ADVANCES TABLE
-- =====================================================
DROP POLICY IF EXISTS "salary_advances_select" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_insert" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_update" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_own_select" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_hr_select" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_hr_insert" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_hr_update" ON public.salary_advances;

CREATE POLICY "salary_advances_hr_select"
  ON public.salary_advances FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "salary_advances_hr_insert"
  ON public.salary_advances FOR INSERT
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "salary_advances_hr_update"
  ON public.salary_advances FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));
