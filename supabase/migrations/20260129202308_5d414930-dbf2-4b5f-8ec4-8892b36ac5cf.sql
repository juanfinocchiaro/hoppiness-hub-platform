
-- ============================================
-- SECURITY HARDENING MIGRATION - PART 2 (v4)
-- ============================================

-- 1. CASH_REGISTER_MOVEMENTS - Only shift owner or managers
DROP POLICY IF EXISTS "Staff can view cash movements" ON cash_register_movements;
DROP POLICY IF EXISTS "Branch staff can view cash movements" ON cash_register_movements;

CREATE POLICY "Shift owner or managers view cash movements"
ON cash_register_movements FOR SELECT
TO authenticated
USING (
  operated_by = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role IN ('superadmin', 'contador_marca')
      OR (ur.local_role IN ('encargado', 'franquiciado', 'contador_local') AND cash_register_movements.branch_id = ANY(ur.branch_ids))
    )
  )
);

-- 2. CUSTOMER_ADDRESSES TABLE - Restrict to order managers only
DROP POLICY IF EXISTS "Staff can view customer addresses" ON customer_addresses;
DROP POLICY IF EXISTS "Customer addresses viewable by staff" ON customer_addresses;

CREATE POLICY "Order managers can view customer addresses"
ON customer_addresses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customers c 
    WHERE c.id = customer_addresses.customer_id 
    AND c.user_id = auth.uid()
  )
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND ur.local_role IS NOT NULL
  )
);
