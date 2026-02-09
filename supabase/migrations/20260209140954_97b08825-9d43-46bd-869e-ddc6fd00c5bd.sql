
-- =============================================
-- MIGRACIÓN 4: RLS POLICIES
-- =============================================

-- Helper adicional para socios (solo superadmin y franquiciado del local)
CREATE OR REPLACE FUNCTION is_socio_admin(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id
    AND branch_id = _branch_id
    AND local_role = 'franquiciado'
    AND is_active = true
  )
$$;

-- =============================================
-- CATEGORÍAS DE INSUMO (tabla de marca)
-- =============================================
CREATE POLICY "categorias_insumo_select_staff"
  ON categorias_insumo FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "categorias_insumo_write_admin"
  ON categorias_insumo FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- =============================================
-- INSUMOS (tabla de marca)
-- =============================================
CREATE POLICY "insumos_select_staff"
  ON insumos FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "insumos_write_admin"
  ON insumos FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- =============================================
-- PROVEEDORES (ámbito marca = global, ámbito local = solo esa sucursal)
-- =============================================
CREATE POLICY "proveedores_select"
  ON proveedores FOR SELECT TO authenticated
  USING (
    is_superadmin(auth.uid())
    OR ambito = 'marca'
    OR (ambito = 'local' AND can_access_branch(auth.uid(), branch_id))
  );

CREATE POLICY "proveedores_write_financial"
  ON proveedores FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin(auth.uid())
    OR (ambito = 'marca' AND get_brand_role(auth.uid()) IN ('coordinador'))
    OR (ambito = 'local' AND is_financial_for_branch(auth.uid(), branch_id))
  );

CREATE POLICY "proveedores_update_financial"
  ON proveedores FOR UPDATE TO authenticated
  USING (
    is_superadmin(auth.uid())
    OR (ambito = 'marca' AND get_brand_role(auth.uid()) IN ('coordinador'))
    OR (ambito = 'local' AND is_financial_for_branch(auth.uid(), branch_id))
  );

CREATE POLICY "proveedores_delete_admin"
  ON proveedores FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()));

-- =============================================
-- COMPRAS (por sucursal)
-- =============================================
CREATE POLICY "compras_select"
  ON compras FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "compras_insert"
  ON compras FOR INSERT TO authenticated
  WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "compras_update"
  ON compras FOR UPDATE TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "compras_delete_admin"
  ON compras FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()));

-- =============================================
-- PAGOS A PROVEEDORES
-- =============================================
CREATE POLICY "pagos_proveedores_select"
  ON pagos_proveedores FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "pagos_proveedores_insert"
  ON pagos_proveedores FOR INSERT TO authenticated
  WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "pagos_proveedores_update"
  ON pagos_proveedores FOR UPDATE TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

-- =============================================
-- GASTOS
-- =============================================
CREATE POLICY "gastos_select"
  ON gastos FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "gastos_insert"
  ON gastos FOR INSERT TO authenticated
  WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "gastos_update"
  ON gastos FOR UPDATE TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "gastos_delete_admin"
  ON gastos FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()));

-- =============================================
-- VENTAS MENSUALES LOCAL (marca carga)
-- =============================================
CREATE POLICY "ventas_mensuales_select"
  ON ventas_mensuales_local FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "ventas_mensuales_write_admin"
  ON ventas_mensuales_local FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'contador_marca');

CREATE POLICY "ventas_mensuales_update_admin"
  ON ventas_mensuales_local FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'contador_marca');

-- =============================================
-- CANON LIQUIDACIONES
-- =============================================
CREATE POLICY "canon_select"
  ON canon_liquidaciones FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "canon_write_admin"
  ON canon_liquidaciones FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'contador_marca');

CREATE POLICY "canon_update_admin"
  ON canon_liquidaciones FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'contador_marca');

-- =============================================
-- PAGOS DE CANON
-- =============================================
CREATE POLICY "pagos_canon_select"
  ON pagos_canon FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "pagos_canon_insert"
  ON pagos_canon FOR INSERT TO authenticated
  WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));

-- =============================================
-- CONSUMOS MANUALES
-- =============================================
CREATE POLICY "consumos_manuales_select"
  ON consumos_manuales FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "consumos_manuales_insert"
  ON consumos_manuales FOR INSERT TO authenticated
  WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "consumos_manuales_update"
  ON consumos_manuales FOR UPDATE TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

-- =============================================
-- SOCIOS (solo superadmin y franquiciado)
-- =============================================
CREATE POLICY "socios_select"
  ON socios FOR SELECT TO authenticated
  USING (is_socio_admin(auth.uid(), branch_id));

CREATE POLICY "socios_insert"
  ON socios FOR INSERT TO authenticated
  WITH CHECK (is_socio_admin(auth.uid(), branch_id));

CREATE POLICY "socios_update"
  ON socios FOR UPDATE TO authenticated
  USING (is_socio_admin(auth.uid(), branch_id));

-- =============================================
-- MOVIMIENTOS SOCIO
-- =============================================
CREATE POLICY "movimientos_socio_select"
  ON movimientos_socio FOR SELECT TO authenticated
  USING (is_socio_admin(auth.uid(), branch_id));

CREATE POLICY "movimientos_socio_insert"
  ON movimientos_socio FOR INSERT TO authenticated
  WITH CHECK (is_socio_admin(auth.uid(), branch_id));

-- =============================================
-- DISTRIBUCIONES DE UTILIDADES
-- =============================================
CREATE POLICY "distribuciones_select"
  ON distribuciones_utilidades FOR SELECT TO authenticated
  USING (is_socio_admin(auth.uid(), branch_id));

CREATE POLICY "distribuciones_insert"
  ON distribuciones_utilidades FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "distribuciones_update"
  ON distribuciones_utilidades FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()));

-- =============================================
-- PERIODOS (superadmin y franquiciado pueden cerrar)
-- =============================================
CREATE POLICY "periodos_select"
  ON periodos FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

CREATE POLICY "periodos_insert"
  ON periodos FOR INSERT TO authenticated
  WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "periodos_update"
  ON periodos FOR UPDATE TO authenticated
  USING (is_socio_admin(auth.uid(), branch_id));

-- =============================================
-- CONFIGURACIÓN DE IMPUESTOS
-- =============================================
CREATE POLICY "config_impuestos_select"
  ON configuracion_impuestos FOR SELECT TO authenticated
  USING (is_financial_for_branch(auth.uid(), branch_id));

CREATE POLICY "config_impuestos_write"
  ON configuracion_impuestos FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "config_impuestos_update"
  ON configuracion_impuestos FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()));

-- =============================================
-- FINANCIAL AUDIT LOG (solo superadmin lectura, escritura via trigger)
-- =============================================
CREATE POLICY "financial_audit_log_select_admin"
  ON financial_audit_log FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()));
