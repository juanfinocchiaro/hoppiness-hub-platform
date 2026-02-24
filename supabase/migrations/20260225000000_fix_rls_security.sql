-- =============================================
-- Fix overly permissive RLS policies
-- =============================================

-- 1. delivery_tracking: restrict public read to token-based access via edge function
--    The edge function uses service_role, so we only need staff + superadmin policies
DROP POLICY IF EXISTS "Public read by tracking_token" ON delivery_tracking;

-- 2. promociones: restrict write to staff only (was allowing any authenticated user)
DROP POLICY IF EXISTS "auth_insert_promociones" ON public.promociones;
DROP POLICY IF EXISTS "auth_update_promociones" ON public.promociones;

CREATE POLICY "staff_insert_promociones" ON public.promociones
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = auth.uid()
        AND ub.role IN ('admin', 'brand_admin', 'owner', 'manager')
    )
  );

CREATE POLICY "staff_update_promociones" ON public.promociones
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = auth.uid()
        AND ub.role IN ('admin', 'brand_admin', 'owner', 'manager')
    )
  );

-- 3. codigos_descuento: restrict write to staff only
DROP POLICY IF EXISTS "auth_insert_codigos" ON public.codigos_descuento;
DROP POLICY IF EXISTS "auth_update_codigos" ON public.codigos_descuento;

CREATE POLICY "staff_insert_codigos" ON public.codigos_descuento
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = auth.uid()
        AND ub.role IN ('admin', 'brand_admin', 'owner', 'manager')
    )
  );

CREATE POLICY "staff_update_codigos" ON public.codigos_descuento
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = auth.uid()
        AND ub.role IN ('admin', 'brand_admin', 'owner', 'manager')
    )
  );

-- 4. promocion_items: restrict write to staff only
DROP POLICY IF EXISTS "auth_insert_promo_items" ON public.promocion_items;
DROP POLICY IF EXISTS "auth_update_promo_items" ON public.promocion_items;
DROP POLICY IF EXISTS "auth_delete_promo_items" ON public.promocion_items;

CREATE POLICY "staff_insert_promo_items" ON public.promocion_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = auth.uid()
        AND ub.role IN ('admin', 'brand_admin', 'owner', 'manager')
    )
  );

CREATE POLICY "staff_update_promo_items" ON public.promocion_items
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = auth.uid()
        AND ub.role IN ('admin', 'brand_admin', 'owner', 'manager')
    )
  );

CREATE POLICY "staff_delete_promo_items" ON public.promocion_items
  FOR DELETE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = auth.uid()
        AND ub.role IN ('admin', 'brand_admin', 'owner', 'manager')
    )
  );
