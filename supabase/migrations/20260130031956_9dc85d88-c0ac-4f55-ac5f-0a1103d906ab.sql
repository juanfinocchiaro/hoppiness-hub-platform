
-- =====================================================
-- SECURITY HARDENING MIGRATION - PART 3: REMAINING TABLES
-- =====================================================

-- =====================================================
-- USER_INVITATIONS TABLE (uses accepted_at instead of status)
-- =====================================================
DROP POLICY IF EXISTS "user_invitations_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_insert" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_update" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_token_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_hr_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_hr_insert" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_hr_update" ON public.user_invitations;

-- Anyone can read pending invitations (by token, for accepting)
CREATE POLICY "user_invitations_token_select"
  ON public.user_invitations FOR SELECT
  USING (accepted_at IS NULL AND expires_at > now());

-- HR can view all invitations they created
CREATE POLICY "user_invitations_hr_select"
  ON public.user_invitations FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- HR can insert invitations
CREATE POLICY "user_invitations_hr_insert"
  ON public.user_invitations FOR INSERT
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

-- Anyone can update pending invitations (to accept them)
CREATE POLICY "user_invitations_update_pending"
  ON public.user_invitations FOR UPDATE
  USING (accepted_at IS NULL AND expires_at > now());

-- =====================================================
-- CONTACT_MESSAGES TABLE
-- =====================================================
DROP POLICY IF EXISTS "contact_messages_select" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_messages_insert" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_messages_update" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_messages_admin_select" ON public.contact_messages;

-- Anyone can insert (contact form)
CREATE POLICY "contact_messages_public_insert"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Only admins/coordinators can read messages
CREATE POLICY "contact_messages_admin_select"
  ON public.contact_messages FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid()
      AND is_active = true
      AND brand_role IN ('superadmin', 'coordinador')
    )
  );

-- =====================================================
-- BRANCH_CUSTOMER_ACCOUNTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "branch_customer_accounts_select" ON public.branch_customer_accounts;
DROP POLICY IF EXISTS "branch_customer_accounts_insert" ON public.branch_customer_accounts;
DROP POLICY IF EXISTS "branch_customer_accounts_update" ON public.branch_customer_accounts;
DROP POLICY IF EXISTS "branch_customer_accounts_staff_select" ON public.branch_customer_accounts;
DROP POLICY IF EXISTS "branch_customer_accounts_staff_insert" ON public.branch_customer_accounts;
DROP POLICY IF EXISTS "branch_customer_accounts_staff_update" ON public.branch_customer_accounts;

CREATE POLICY "branch_customer_accounts_staff_select"
  ON public.branch_customer_accounts FOR SELECT
  USING (public.is_cashier_for_branch(auth.uid(), branch_id));

CREATE POLICY "branch_customer_accounts_staff_insert"
  ON public.branch_customer_accounts FOR INSERT
  WITH CHECK (public.is_cashier_for_branch(auth.uid(), branch_id));

CREATE POLICY "branch_customer_accounts_staff_update"
  ON public.branch_customer_accounts FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- =====================================================
-- KDS_TOKENS TABLE
-- =====================================================
DROP POLICY IF EXISTS "kds_tokens_select" ON public.kds_tokens;
DROP POLICY IF EXISTS "kds_tokens_insert" ON public.kds_tokens;
DROP POLICY IF EXISTS "kds_tokens_update" ON public.kds_tokens;
DROP POLICY IF EXISTS "kds_tokens_manager_select" ON public.kds_tokens;
DROP POLICY IF EXISTS "kds_tokens_manager_insert" ON public.kds_tokens;
DROP POLICY IF EXISTS "kds_tokens_manager_update" ON public.kds_tokens;

CREATE POLICY "kds_tokens_manager_select"
  ON public.kds_tokens FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "kds_tokens_manager_insert"
  ON public.kds_tokens FOR INSERT
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "kds_tokens_manager_update"
  ON public.kds_tokens FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- =====================================================
-- COA_ACCOUNTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "coa_accounts_select" ON public.coa_accounts;
DROP POLICY IF EXISTS "coa_accounts_public_read" ON public.coa_accounts;
DROP POLICY IF EXISTS "coa_accounts_financial_select" ON public.coa_accounts;

CREATE POLICY "coa_accounts_financial_select"
  ON public.coa_accounts FOR SELECT
  USING (public.is_financial_manager(auth.uid()));

-- =====================================================
-- PERMISSION_DEFINITIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "permission_definitions_select" ON public.permission_definitions;
DROP POLICY IF EXISTS "permission_definitions_public_read" ON public.permission_definitions;
DROP POLICY IF EXISTS "permission_definitions_admin_select" ON public.permission_definitions;

CREATE POLICY "permission_definitions_admin_select"
  ON public.permission_definitions FOR SELECT
  USING (public.is_superadmin(auth.uid()));

-- =====================================================
-- BRAND_MANDATORY_CATEGORIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "brand_mandatory_categories_select" ON public.brand_mandatory_categories;
DROP POLICY IF EXISTS "brand_mandatory_categories_public_read" ON public.brand_mandatory_categories;
DROP POLICY IF EXISTS "brand_mandatory_categories_staff_select" ON public.brand_mandatory_categories;

CREATE POLICY "brand_mandatory_categories_staff_select"
  ON public.brand_mandatory_categories FOR SELECT
  USING (public.is_staff_member(auth.uid()));

-- =====================================================
-- TRANSACTION_CATEGORIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "transaction_categories_select" ON public.transaction_categories;
DROP POLICY IF EXISTS "transaction_categories_public_read" ON public.transaction_categories;
DROP POLICY IF EXISTS "transaction_categories_financial_select" ON public.transaction_categories;

CREATE POLICY "transaction_categories_financial_select"
  ON public.transaction_categories FOR SELECT
  USING (public.is_financial_manager(auth.uid()));

-- =====================================================
-- CLOCK_ENTRIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "clock_entries_select" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_insert" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_update" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_own_select" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_hr_select" ON public.clock_entries;
DROP POLICY IF EXISTS "clock_entries_insert_own" ON public.clock_entries;

CREATE POLICY "clock_entries_own_select"
  ON public.clock_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "clock_entries_hr_select"
  ON public.clock_entries FOR SELECT
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "clock_entries_insert_own"
  ON public.clock_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
