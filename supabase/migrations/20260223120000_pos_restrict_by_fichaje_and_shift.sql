-- =====================================================
-- POS: Restringir por fichaje y turno de caja por rol
-- Franquiciado/Contador: sin fichaje. Encargado/Cajero: fichaje para abrir turno; turno abierto para vender.
-- =====================================================

-- 1. Función: usuario tiene turno de caja abierto en el branch
CREATE OR REPLACE FUNCTION public.has_open_shift_at_branch(p_user_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cash_register_shifts
    WHERE opened_by = p_user_id
      AND branch_id = p_branch_id
      AND status = 'open'
  )
$$;

-- 2. Función: usuario está fichado (última entrada es clock_in sin clock_out posterior)
CREATE OR REPLACE FUNCTION public.is_clocked_in_at_branch(p_user_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT entry_type = 'clock_in'
    FROM clock_entries
    WHERE user_id = p_user_id AND branch_id = p_branch_id
    ORDER BY created_at DESC
    LIMIT 1
  ) IS TRUE
$$;

-- 3. Función: usuario es franquiciado o contador_local en ese branch (acceso sin fichaje)
CREATE OR REPLACE FUNCTION public.is_franquiciado_or_contador_for_branch(p_user_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = p_user_id
      AND branch_id = p_branch_id
      AND is_active = true
      AND local_role IN ('franquiciado', 'contador_local')
  )
$$;

-- 4. cash_register_shifts: INSERT solo si (superadmin OR franquiciado/contador OR (encargado/cajero Y fichado))
DROP POLICY IF EXISTS "Staff can manage cash_register_shifts" ON cash_register_shifts;
CREATE POLICY "Staff select cash_register_shifts" ON cash_register_shifts
  FOR SELECT USING (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  );
CREATE POLICY "Staff update cash_register_shifts" ON cash_register_shifts
  FOR UPDATE USING (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  )
  WITH CHECK (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  );
CREATE POLICY "Staff delete cash_register_shifts" ON cash_register_shifts
  FOR DELETE USING (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  );
CREATE POLICY "Staff insert cash_register_shifts_with_fichaje" ON cash_register_shifts
  FOR INSERT
  WITH CHECK (
    (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
    AND (
      public.is_superadmin(auth.uid())
      OR public.is_franquiciado_or_contador_for_branch(auth.uid(), branch_id)
      OR (
        (SELECT public.get_local_role_for_branch(auth.uid(), branch_id)) IN ('encargado', 'cajero')
        AND public.is_clocked_in_at_branch(auth.uid(), branch_id)
      )
    )
  );

-- 5. pedidos: INSERT solo si (superadmin OR franquiciado/contador OR turno abierto)
DROP POLICY IF EXISTS "Staff can manage pedidos" ON pedidos;
CREATE POLICY "Staff select pedidos" ON pedidos
  FOR SELECT USING (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  );
CREATE POLICY "Staff update pedidos" ON pedidos
  FOR UPDATE USING (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  )
  WITH CHECK (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  );
CREATE POLICY "Staff delete pedidos" ON pedidos
  FOR DELETE USING (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  );
CREATE POLICY "Staff insert pedidos_with_shift" ON pedidos
  FOR INSERT
  WITH CHECK (
    (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
    AND (
      public.is_superadmin(auth.uid())
      OR public.is_franquiciado_or_contador_for_branch(auth.uid(), branch_id)
      OR public.has_open_shift_at_branch(auth.uid(), branch_id)
    )
  );

-- 6. pedido_pagos: INSERT mismo criterio (branch vía pedido)
DROP POLICY IF EXISTS "Staff can manage pedido_pagos" ON pedido_pagos;
CREATE POLICY "Staff select pedido_pagos" ON pedido_pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_pagos.pedido_id
        AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))
    )
  );
CREATE POLICY "Staff update pedido_pagos" ON pedido_pagos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_pagos.pedido_id
        AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_pagos.pedido_id
        AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))
    )
  );
CREATE POLICY "Staff delete pedido_pagos" ON pedido_pagos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_pagos.pedido_id
        AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))
    )
  );
CREATE POLICY "Staff insert pedido_pagos_with_shift" ON pedido_pagos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_pagos.pedido_id
        AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))
        AND (
          public.is_superadmin(auth.uid())
          OR public.is_franquiciado_or_contador_for_branch(auth.uid(), p.branch_id)
          OR public.has_open_shift_at_branch(auth.uid(), p.branch_id)
        )
    )
  );
