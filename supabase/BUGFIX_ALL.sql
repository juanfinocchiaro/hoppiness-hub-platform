-- ============================================================
-- BUGFIX_ALL.sql
-- Correr en el SQL Editor de Supabase EN 5 BLOQUES SEPARADOS
-- Copiar y pegar cada bloque, correr, y pasar al siguiente
-- ============================================================


-- ===================== BLOQUE 1 =============================
-- validate_supervisor_pin: filtrar por branch + search_path
-- Copiar desde aqui hasta "FIN BLOQUE 1" y correr
-- =============================================================

CREATE OR REPLACE FUNCTION public.validate_supervisor_pin(_branch_id UUID, _pin TEXT)
RETURNS TABLE (user_id UUID, full_name TEXT, role TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE v_user_id UUID; v_full_name TEXT; v_role TEXT;
BEGIN
  SELECT ur.user_id, COALESCE(p.full_name, u.email::TEXT), ur.role::TEXT
  INTO v_user_id, v_full_name, v_role
  FROM user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.is_active = TRUE
    AND ur.branch_id = _branch_id
    AND ur.role IN ('encargado', 'franquiciado', 'admin', 'coordinador')
    AND EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = auth.uid() AND ur2.branch_id = _branch_id AND ur2.is_active = TRUE
    )
  LIMIT 1;
  IF v_user_id IS NOT NULL THEN RETURN QUERY SELECT v_user_id, v_full_name, v_role; END IF;
  RETURN;
END;
$fn$;

-- FIN BLOQUE 1


-- ===================== BLOQUE 2 =============================
-- descontar_stock_pedido: fix cantidad_nueva doble-restada
-- Copiar desde aqui hasta "FIN BLOQUE 2" y correr
-- =============================================================

CREATE OR REPLACE FUNCTION public.descontar_stock_pedido()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
DECLARE v_branch_id UUID; v_composicion RECORD; v_cantidad_descontar DECIMAL(10,3);
BEGIN
  SELECT branch_id INTO v_branch_id FROM pedidos WHERE id = NEW.pedido_id;
  FOR v_composicion IN
    SELECT icc.insumo_id, icc.cantidad::DECIMAL(10,3) AS cantidad_receta
    FROM item_carta_composicion icc
    WHERE icc.item_carta_id = NEW.item_carta_id AND icc.insumo_id IS NOT NULL
  LOOP
    v_cantidad_descontar := v_composicion.cantidad_receta * NEW.cantidad;
    UPDATE stock_actual SET cantidad = cantidad - v_cantidad_descontar, updated_at = NOW()
    WHERE branch_id = v_branch_id AND insumo_id = v_composicion.insumo_id AND cantidad >= v_cantidad_descontar;
    IF FOUND THEN
      INSERT INTO stock_movimientos (branch_id, insumo_id, tipo, cantidad, cantidad_anterior, cantidad_nueva, pedido_id)
      SELECT v_branch_id, v_composicion.insumo_id, 'venta', -v_cantidad_descontar,
        sa.cantidad + v_cantidad_descontar, sa.cantidad, NEW.pedido_id
      FROM stock_actual sa WHERE sa.branch_id = v_branch_id AND sa.insumo_id = v_composicion.insumo_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$fn$;

-- FIN BLOQUE 2


-- ===================== BLOQUE 3 =============================
-- get_rdo_financiero: access check + totals + search_path
-- Copiar desde aqui hasta "FIN BLOQUE 3" y correr
-- =============================================================

CREATE OR REPLACE FUNCTION get_rdo_financiero(
  _branch_id uuid,
  _periodo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _start date;
  _end   date;
  _result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND branch_id = _branch_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'No tiene acceso a esta sucursal';
  END IF;

  _start := (_periodo || '-01')::date;
  _end   := (_start + interval '1 month')::date;

  WITH
  ingresos_pos AS (
    SELECT pp.metodo, coalesce(sum(pp.monto), 0) AS total
    FROM pedido_pagos pp
    JOIN pedidos p ON p.id = pp.pedido_id
    WHERE p.branch_id = _branch_id
      AND p.created_at >= _start AND p.created_at < _end
      AND p.estado NOT IN ('cancelado')
    GROUP BY pp.metodo
  ),
  ingresos_total AS (
    SELECT coalesce(sum(total), 0) AS total FROM ingresos_pos
  ),
  pagos_proveedores_agg AS (
    SELECT coalesce(sum(monto), 0) AS total
    FROM pagos_proveedores
    WHERE branch_id = _branch_id AND fecha_pago >= _start AND fecha_pago < _end AND deleted_at IS NULL
  ),
  gastos_pagados AS (
    SELECT categoria_principal, coalesce(sum(monto), 0) AS total
    FROM gastos
    WHERE branch_id = _branch_id AND periodo = _periodo AND estado = 'pagado' AND deleted_at IS NULL
    GROUP BY categoria_principal
  ),
  gastos_total AS (
    SELECT coalesce(sum(total), 0) AS total FROM gastos_pagados
  ),
  adelantos_agg AS (
    SELECT coalesce(sum(amount), 0) AS total
    FROM salary_advances
    WHERE branch_id = _branch_id AND paid_at >= _start AND paid_at < _end
      AND status IN ('paid', 'transferred', 'deducted')
  ),
  socios_retiros AS (
    SELECT coalesce(sum(monto), 0) AS total
    FROM movimientos_socio
    WHERE branch_id = _branch_id AND periodo = _periodo AND tipo IN ('retiro', 'distribucion') AND deleted_at IS NULL
  ),
  socios_aportes AS (
    SELECT coalesce(sum(monto), 0) AS total
    FROM movimientos_socio
    WHERE branch_id = _branch_id AND periodo = _periodo AND tipo = 'aporte' AND deleted_at IS NULL
  ),
  inversiones_agg AS (
    SELECT coalesce(sum(monto_total), 0) AS total
    FROM inversiones
    WHERE branch_id = _branch_id AND periodo = _periodo AND estado = 'pagado' AND deleted_at IS NULL
  )
  SELECT jsonb_build_object(
    'ingresos', jsonb_build_object(
      'por_metodo', (SELECT coalesce(jsonb_object_agg(metodo, total), '{}'::jsonb) FROM ingresos_pos),
      'total', (SELECT total FROM ingresos_total),
      'aportes_socios', (SELECT total FROM socios_aportes)
    ),
    'egresos', jsonb_build_object(
      'proveedores', (SELECT total FROM pagos_proveedores_agg),
      'gastos_por_categoria', (SELECT coalesce(jsonb_object_agg(categoria_principal, total), '{}'::jsonb) FROM gastos_pagados),
      'gastos_total', (SELECT total FROM gastos_total),
      'adelantos_sueldo', (SELECT total FROM adelantos_agg),
      'retiros_socios', (SELECT total FROM socios_retiros),
      'inversiones_capex', (SELECT total FROM inversiones_agg)
    ),
    'total_ingresos', (SELECT total FROM ingresos_total) + (SELECT total FROM socios_aportes),
    'total_egresos', (SELECT total FROM pagos_proveedores_agg) + (SELECT total FROM gastos_total) + (SELECT total FROM adelantos_agg) + (SELECT total FROM socios_retiros),
    'resultado_financiero', (SELECT total FROM ingresos_total) + (SELECT total FROM socios_aportes) - (SELECT total FROM pagos_proveedores_agg) - (SELECT total FROM gastos_total) - (SELECT total FROM adelantos_agg) - (SELECT total FROM socios_retiros),
    'flujo_neto', (SELECT total FROM ingresos_total) + (SELECT total FROM socios_aportes) - (SELECT total FROM pagos_proveedores_agg) - (SELECT total FROM gastos_total) - (SELECT total FROM adelantos_agg) - (SELECT total FROM socios_retiros) - (SELECT total FROM inversiones_agg)
  ) INTO _result;

  RETURN _result;
END;
$fn$;

-- FIN BLOQUE 3


-- ===================== BLOQUE 4 =============================
-- mercadopago_config: crear tabla + habilitar RLS + policies
-- Copiar desde aqui hasta "FIN BLOQUE 4" y correr
-- =============================================================

CREATE TABLE IF NOT EXISTS mercadopago_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  access_token text NOT NULL DEFAULT '',
  public_key text NOT NULL DEFAULT '',
  estado_conexion text NOT NULL DEFAULT 'desconectado'
    CHECK (estado_conexion IN ('conectado', 'desconectado', 'error')),
  webhook_secret text,
  collector_id text,
  ultimo_test timestamptz,
  ultimo_test_ok boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

ALTER TABLE mercadopago_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view MP config"
  ON mercadopago_config FOR SELECT
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

CREATE POLICY "Owners can manage MP config"
  ON mercadopago_config FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

-- FIN BLOQUE 4


-- ===================== BLOQUE 5 =============================
-- cashier_discrepancy_history: restringir INSERT policy
-- Copiar desde aqui hasta "FIN BLOQUE 5" y correr
-- =============================================================

DROP POLICY IF EXISTS "System can insert discrepancies" ON cashier_discrepancy_history;
CREATE POLICY "System can insert discrepancies" ON cashier_discrepancy_history
  FOR INSERT WITH CHECK (
    public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid())
  );

-- FIN BLOQUE 5
