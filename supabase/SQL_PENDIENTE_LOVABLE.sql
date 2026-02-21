-- =============================================
-- SQL PENDIENTE PARA LOVABLE - Ejecutar en Supabase SQL Editor
-- Orden: ejecutar por bloques (1 a 9). Si algo ya existe, omitir ese bloque.
-- =============================================

-- ===== BLOQUE 1: POS Tablas principales =====
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  numero_pedido INTEGER NOT NULL,
  numero_llamador INTEGER,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('mostrador', 'delivery', 'webapp')),
  cliente_nombre VARCHAR(100),
  cliente_telefono VARCHAR(20),
  cliente_direccion TEXT,
  cliente_notas TEXT,
  cadete_id UUID REFERENCES auth.users(id),
  direccion_entrega TEXT,
  costo_delivery DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tiempo_prometido TIMESTAMPTZ,
  tiempo_listo TIMESTAMPTZ,
  tiempo_entregado TIMESTAMPTZ,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'
  )),
  subtotal DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(10,2) DEFAULT 0,
  descuento_motivo VARCHAR(100),
  total DECIMAL(10,2) NOT NULL,
  requiere_factura BOOLEAN DEFAULT FALSE,
  tipo_factura VARCHAR(2) CHECK (tipo_factura IN ('A', 'B', 'CF')),
  factura_cuit VARCHAR(13),
  factura_razon_social VARCHAR(100),
  factura_numero VARCHAR(20),
  factura_cae VARCHAR(20),
  factura_vencimiento_cae DATE,
  created_by UUID REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_numero_dia ON pedidos (branch_id, numero_pedido, ((created_at AT TIME ZONE 'UTC')::date));
CREATE INDEX IF NOT EXISTS idx_pedidos_branch_estado ON pedidos(branch_id, estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_branch_fecha ON pedidos(branch_id, created_at);

CREATE TABLE IF NOT EXISTS public.pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  item_carta_id UUID NOT NULL REFERENCES items_carta(id),
  nombre VARCHAR(100) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  notas TEXT,
  estacion VARCHAR(20) NOT NULL CHECK (estacion IN ('parrilla', 'armado', 'fritura', 'entrega', 'bebidas')),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_preparacion', 'listo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);

CREATE TABLE IF NOT EXISTS public.pedido_item_modificadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id UUID NOT NULL REFERENCES pedido_items(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('extra', 'sin', 'cambio')),
  descripcion VARCHAR(100) NOT NULL,
  precio_extra DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pedido_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  metodo VARCHAR(30) NOT NULL CHECK (metodo IN (
    'efectivo', 'tarjeta_debito', 'tarjeta_credito', 'mercadopago_qr', 'transferencia'
  )),
  monto DECIMAL(10,2) NOT NULL,
  monto_recibido DECIMAL(10,2),
  vuelto DECIMAL(10,2),
  tarjeta_ultimos_4 VARCHAR(4),
  tarjeta_marca VARCHAR(20),
  mp_payment_id VARCHAR(50),
  transferencia_referencia VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.turnos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  cajero_id UUID NOT NULL REFERENCES auth.users(id),
  apertura_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fondo_apertura DECIMAL(10,2) NOT NULL,
  cierre_at TIMESTAMPTZ,
  total_efectivo DECIMAL(10,2),
  total_tarjeta_debito DECIMAL(10,2),
  total_tarjeta_credito DECIMAL(10,2),
  total_mercadopago DECIMAL(10,2),
  total_transferencia DECIMAL(10,2),
  total_ventas DECIMAL(10,2),
  efectivo_contado DECIMAL(10,2),
  diferencia DECIMAL(10,2),
  diferencia_motivo TEXT,
  retiros_efectivo DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado'))
);
CREATE INDEX IF NOT EXISTS idx_turnos_caja_branch ON turnos_caja(branch_id);
CREATE INDEX IF NOT EXISTS idx_turnos_caja_estado ON turnos_caja(branch_id, estado) WHERE estado = 'abierto';

CREATE TABLE IF NOT EXISTS public.pos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  impresora_caja_ip VARCHAR(15),
  impresora_cocina_ip VARCHAR(15),
  tiempo_preparacion_default INTEGER DEFAULT 15,
  llamadores_habilitados BOOLEAN DEFAULT TRUE,
  llamador_min INTEGER DEFAULT 1,
  llamador_max INTEGER DEFAULT 50,
  acepta_efectivo BOOLEAN DEFAULT TRUE,
  acepta_debito BOOLEAN DEFAULT TRUE,
  acepta_credito BOOLEAN DEFAULT TRUE,
  acepta_mercadopago BOOLEAN DEFAULT TRUE,
  acepta_transferencia BOOLEAN DEFAULT TRUE,
  delivery_habilitado BOOLEAN DEFAULT TRUE,
  costo_delivery_default DECIMAL(10,2) DEFAULT 0,
  radio_delivery_km DECIMAL(5,2),
  facturacion_habilitada BOOLEAN DEFAULT TRUE,
  afip_punto_venta INTEGER,
  afip_cuit VARCHAR(13),
  alertar_stock_minimo BOOLEAN DEFAULT TRUE,
  alertar_stock_critico BOOLEAN DEFAULT TRUE,
  pos_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_item_modificadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage pedidos" ON pedidos;
CREATE POLICY "Staff can manage pedidos" ON pedidos FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage pedido_items" ON pedido_items;
CREATE POLICY "Staff can manage pedido_items" ON pedido_items FOR ALL
  USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))));
DROP POLICY IF EXISTS "Staff can manage pedido_item_modificadores" ON pedido_item_modificadores;
CREATE POLICY "Staff can manage pedido_item_modificadores" ON pedido_item_modificadores FOR ALL
  USING (EXISTS (SELECT 1 FROM pedido_items pi JOIN pedidos p ON p.id = pi.pedido_id WHERE pi.id = pedido_item_id AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM pedido_items pi JOIN pedidos p ON p.id = pi.pedido_id WHERE pi.id = pedido_item_id AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))));
DROP POLICY IF EXISTS "Staff can manage pedido_pagos" ON pedido_pagos;
CREATE POLICY "Staff can manage pedido_pagos" ON pedido_pagos FOR ALL
  USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))));
DROP POLICY IF EXISTS "Staff can manage turnos_caja" ON turnos_caja;
CREATE POLICY "Staff can manage turnos_caja" ON turnos_caja FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage pos_config" ON pos_config;
CREATE POLICY "Staff can manage pos_config" ON pos_config FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));


-- ===== BLOQUE 2: Stock, cadetes, llamadores, integración cierre =====
CREATE TABLE IF NOT EXISTS public.stock_actual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  cantidad DECIMAL(10,3) NOT NULL DEFAULT 0,
  unidad VARCHAR(20) NOT NULL,
  stock_minimo DECIMAL(10,3),
  stock_critico DECIMAL(10,3),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, insumo_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_branch ON stock_actual(branch_id);

CREATE TABLE IF NOT EXISTS public.stock_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venta', 'compra', 'ajuste', 'merma', 'transferencia')),
  cantidad DECIMAL(10,3) NOT NULL,
  cantidad_anterior DECIMAL(10,3) NOT NULL,
  cantidad_nueva DECIMAL(10,3) NOT NULL,
  pedido_id UUID REFERENCES pedidos(id),
  factura_proveedor_id UUID REFERENCES facturas_proveedores(id),
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_mov_branch_insumo ON stock_movimientos(branch_id, insumo_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_fecha ON stock_movimientos(created_at);

CREATE TABLE IF NOT EXISTS public.cadetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  disponible BOOLEAN DEFAULT TRUE,
  pedidos_hoy INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cadetes_branch ON cadetes(branch_id);

CREATE TABLE IF NOT EXISTS public.llamadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 99),
  en_uso BOOLEAN DEFAULT FALSE,
  pedido_id UUID REFERENCES pedidos(id),
  asignado_at TIMESTAMPTZ,
  UNIQUE(branch_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_llamadores_branch ON llamadores(branch_id);

ALTER TABLE stock_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage stock_actual" ON stock_actual;
CREATE POLICY "Staff can manage stock_actual" ON stock_actual FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage stock_movimientos" ON stock_movimientos;
CREATE POLICY "Staff can manage stock_movimientos" ON stock_movimientos FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage cadetes" ON cadetes;
CREATE POLICY "Staff can manage cadetes" ON cadetes FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage llamadores" ON llamadores;
CREATE POLICY "Staff can manage llamadores" ON llamadores FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

ALTER TABLE public.items_carta ADD COLUMN IF NOT EXISTS closure_category VARCHAR(30);
COMMENT ON COLUMN public.items_carta.closure_category IS 'Categoría para cierre de turno: clasica, original, veggie, etc.';
ALTER TABLE public.shift_closures ADD COLUMN IF NOT EXISTS fuente VARCHAR(20) DEFAULT 'manual';
COMMENT ON COLUMN public.shift_closures.fuente IS 'pos = generado desde POS, manual = carga manual';

CREATE OR REPLACE FUNCTION public.generar_numero_pedido(p_branch_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_pedido), 0) + 1 INTO v_numero
  FROM pedidos WHERE branch_id = p_branch_id AND (created_at AT TIME ZONE 'UTC')::date = CURRENT_DATE;
  RETURN v_numero;
END;
$$;

CREATE OR REPLACE FUNCTION public.asignar_llamador(p_branch_id UUID, p_pedido_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_numero INTEGER;
BEGIN
  SELECT numero INTO v_numero FROM llamadores
  WHERE branch_id = p_branch_id AND en_uso = FALSE ORDER BY numero LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_numero IS NULL THEN RETURN NULL; END IF;
  UPDATE llamadores SET en_uso = TRUE, pedido_id = p_pedido_id, asignado_at = NOW()
  WHERE branch_id = p_branch_id AND numero = v_numero;
  RETURN v_numero;
END;
$$;

CREATE OR REPLACE FUNCTION public.liberar_llamador(p_pedido_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  UPDATE llamadores SET en_uso = FALSE, pedido_id = NULL, asignado_at = NULL WHERE pedido_id = p_pedido_id;
END;
$$;

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
DROP TRIGGER IF EXISTS trg_descontar_stock ON pedido_items;
CREATE TRIGGER trg_descontar_stock AFTER INSERT ON pedido_items FOR EACH ROW EXECUTE FUNCTION descontar_stock_pedido();

CREATE OR REPLACE FUNCTION public.generar_shift_closure_desde_pos(p_branch_id UUID, p_fecha DATE, p_turno TEXT)
RETURNS UUID LANGUAGE plpgsql SET search_path TO 'public' SECURITY DEFINER AS $$
DECLARE v_closure_id UUID; v_cerrado_por UUID := auth.uid();
BEGIN
  IF NOT (public.has_branch_access_v2(v_cerrado_por, p_branch_id) OR public.is_superadmin(v_cerrado_por)) THEN
    RAISE EXCEPTION 'No tienes acceso a esta sucursal';
  END IF;
  IF p_turno NOT IN ('mañana', 'mediodía', 'noche', 'trasnoche') THEN RAISE EXCEPTION 'Turno inválido'; END IF;
  INSERT INTO shift_closures (
    branch_id, fecha, turno, hamburguesas, ventas_local, ventas_apps,
    total_hamburguesas, total_vendido, total_efectivo, total_digital,
    facturacion_esperada, facturacion_diferencia, total_facturado, cerrado_por, fuente
  )
  SELECT p_branch_id, p_fecha, p_turno, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
    0, 0, 0, 0, 0, 0, 0, v_cerrado_por, 'pos'
  WHERE NOT EXISTS (SELECT 1 FROM shift_closures WHERE branch_id = p_branch_id AND fecha = p_fecha AND turno = p_turno)
  RETURNING id INTO v_closure_id;
  IF v_closure_id IS NULL THEN
    SELECT id INTO v_closure_id FROM shift_closures WHERE branch_id = p_branch_id AND fecha = p_fecha AND turno = p_turno;
  END IF;
  RETURN v_closure_id;
END;
$$;


-- ===== BLOQUE 3: Canal de venta y tipo de servicio (pedidos) =====
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS canal_venta VARCHAR(20) DEFAULT 'mostrador' CHECK (canal_venta IN ('mostrador', 'apps')),
  ADD COLUMN IF NOT EXISTS tipo_servicio VARCHAR(20) CHECK (tipo_servicio IN ('takeaway', 'comer_aca', 'delivery')),
  ADD COLUMN IF NOT EXISTS canal_app VARCHAR(20) CHECK (canal_app IN ('rappi', 'pedidos_ya', 'mp_delivery'));
COMMENT ON COLUMN public.pedidos.canal_venta IS 'Origen del pedido: mostrador o apps de delivery';
COMMENT ON COLUMN public.pedidos.tipo_servicio IS 'Para mostrador: takeaway, comer_aca, delivery';
COMMENT ON COLUMN public.pedidos.canal_app IS 'Cuando canal_venta=apps: rappi, pedidos_ya, mp_delivery';


-- ===== BLOQUE 4: Cajas (cash_registers, shifts, movements) =====
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_registers_branch ON cash_registers(branch_id);

CREATE TABLE IF NOT EXISTS public.cash_register_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);
CREATE INDEX IF NOT EXISTS idx_cash_register_shifts_register ON cash_register_shifts(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_shifts_branch_status ON cash_register_shifts(branch_id, status);

CREATE TABLE IF NOT EXISTS public.cash_register_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES cash_register_shifts(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'withdrawal', 'deposit')),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  amount DECIMAL(10,2) NOT NULL,
  concept VARCHAR(255) NOT NULL,
  order_id UUID REFERENCES pedidos(id),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_shift ON cash_register_movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_branch ON cash_register_movements(branch_id);

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage cash_registers" ON cash_registers;
CREATE POLICY "Staff can manage cash_registers" ON cash_registers FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage cash_register_shifts" ON cash_register_shifts;
CREATE POLICY "Staff can manage cash_register_shifts" ON cash_register_shifts FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage cash_register_movements" ON cash_register_movements;
CREATE POLICY "Staff can manage cash_register_movements" ON cash_register_movements FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

INSERT INTO public.cash_registers (branch_id, name, display_order, is_active)
  SELECT b.id, 'Caja 1', 0, TRUE
  FROM branches b
  WHERE NOT EXISTS (SELECT 1 FROM cash_registers r WHERE r.branch_id = b.id);


-- ===== BLOQUE 5: Propina en pedidos =====
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS propina DECIMAL(10,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.pedidos.propina IS 'Propina opcional del cliente (POS)';


-- ===== BLOQUE 6: Operator verification (validate_supervisor_pin usa user_roles; si usan user_roles_v2 hay que adaptar) =====
CREATE TABLE IF NOT EXISTS public.operator_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  current_user_id UUID NOT NULL REFERENCES auth.users(id),
  previous_user_id UUID REFERENCES auth.users(id),
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('confirm_identity', 'operator_change')),
  triggered_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operator_logs_branch ON operator_session_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_user ON operator_session_logs(current_user_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_date ON operator_session_logs(created_at);
ALTER TABLE operator_session_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branch access for operator logs" ON operator_session_logs;
CREATE POLICY "Branch access for operator logs" ON operator_session_logs
  FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_supervisor_pin(_branch_id UUID, _pin TEXT)
RETURNS TABLE (user_id UUID, full_name TEXT, role TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
COMMENT ON FUNCTION public.validate_supervisor_pin IS 'Valida supervisor por rol en la sucursal. PIN placeholder - agregar pin_hash en profiles para validacion real';


-- ===== BLOQUE 7: Discrepancias de cajero =====
CREATE TABLE IF NOT EXISTS public.cashier_discrepancy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES cash_register_shifts(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cash_register_id UUID REFERENCES cash_registers(id),
  expected_amount DECIMAL(10,2) NOT NULL,
  actual_amount DECIMAL(10,2) NOT NULL,
  discrepancy DECIMAL(10,2) NOT NULL,
  shift_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discrepancy_user ON cashier_discrepancy_history(user_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_branch ON cashier_discrepancy_history(branch_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_date ON cashier_discrepancy_history(shift_date);
CREATE INDEX IF NOT EXISTS idx_discrepancy_shift ON cashier_discrepancy_history(shift_id);
ALTER TABLE cashier_discrepancy_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view discrepancies" ON cashier_discrepancy_history;
CREATE POLICY "Staff can view discrepancies" ON cashier_discrepancy_history FOR SELECT
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
DROP POLICY IF EXISTS "System can insert discrepancies" ON cashier_discrepancy_history;
CREATE POLICY "System can insert discrepancies" ON cashier_discrepancy_history FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_cashier_discrepancy_stats(_user_id UUID, _branch_id UUID DEFAULT NULL)
RETURNS TABLE (total_shifts INTEGER, perfect_shifts INTEGER, precision_pct NUMERIC, discrepancy_this_month NUMERIC, discrepancy_total NUMERIC, last_discrepancy_date DATE, last_discrepancy_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total_shifts INTEGER := 0; v_perfect_shifts INTEGER := 0; v_discrepancy_month NUMERIC := 0; v_discrepancy_total NUMERIC := 0; v_last_date DATE; v_last_amount NUMERIC := 0;
BEGIN
  SELECT COUNT(*)::INTEGER, COUNT(*) FILTER (WHERE discrepancy = 0)::INTEGER,
    COALESCE(SUM(discrepancy) FILTER (WHERE DATE_TRUNC('month', shift_date) = DATE_TRUNC('month', CURRENT_DATE)), 0),
    COALESCE(SUM(discrepancy), 0), MAX(shift_date)
  INTO v_total_shifts, v_perfect_shifts, v_discrepancy_month, v_discrepancy_total, v_last_date
  FROM cashier_discrepancy_history WHERE user_id = _user_id AND (_branch_id IS NULL OR branch_id = _branch_id);
  IF v_last_date IS NOT NULL THEN
    SELECT COALESCE(SUM(discrepancy), 0) INTO v_last_amount FROM cashier_discrepancy_history
    WHERE user_id = _user_id AND (_branch_id IS NULL OR branch_id = _branch_id) AND shift_date = v_last_date;
  END IF;
  RETURN QUERY SELECT v_total_shifts, v_perfect_shifts,
    CASE WHEN v_total_shifts > 0 THEN ROUND((v_perfect_shifts::NUMERIC / v_total_shifts::NUMERIC) * 100, 1) ELSE 100 END,
    v_discrepancy_month, v_discrepancy_total, v_last_date, v_last_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_cashier_discrepancy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'closed' AND NEW.closed_by IS NOT NULL AND NEW.difference IS NOT NULL THEN
    INSERT INTO cashier_discrepancy_history (shift_id, branch_id, user_id, cash_register_id, expected_amount, actual_amount, discrepancy, shift_date, notes)
    VALUES (NEW.id, NEW.branch_id, NEW.closed_by, NEW.cash_register_id, COALESCE(NEW.expected_amount, 0), COALESCE(NEW.closing_amount, 0), COALESCE(NEW.difference, 0), DATE(NEW.closed_at), NEW.notes);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_record_cashier_discrepancy ON cash_register_shifts;
CREATE TRIGGER trg_record_cashier_discrepancy
  AFTER UPDATE OF status, closed_at, difference ON cash_register_shifts
  FOR EACH ROW WHEN (NEW.status = 'closed' AND OLD.status = 'open')
  EXECUTE FUNCTION public.record_cashier_discrepancy();


-- ===== BLOQUE 8: Compras suman stock (trigger items_factura) =====
CREATE OR REPLACE FUNCTION public.sumar_stock_desde_compra()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_branch_id UUID; v_unidad_base TEXT; v_contenido DECIMAL(12,4); v_cantidad_base DECIMAL(10,3); v_cantidad_anterior DECIMAL(10,3); v_cantidad_nueva DECIMAL(10,3);
BEGIN
  IF NEW.insumo_id IS NULL OR (NEW.tipo_item IS NOT NULL AND NEW.tipo_item != 'insumo') THEN RETURN NEW; END IF;
  SELECT f.branch_id INTO v_branch_id FROM facturas_proveedores f WHERE f.id = NEW.factura_id AND f.deleted_at IS NULL;
  IF v_branch_id IS NULL THEN RETURN NEW; END IF;
  SELECT i.unidad_base, COALESCE(i.unidad_compra_contenido, 1) INTO v_unidad_base, v_contenido FROM insumos i WHERE i.id = NEW.insumo_id;
  IF v_unidad_base IS NULL THEN v_unidad_base := COALESCE(NEW.unidad, 'un'); v_contenido := 1; END IF;
  IF NEW.unidad IS NOT NULL AND LOWER(TRIM(NEW.unidad)) != LOWER(v_unidad_base) AND v_contenido > 0 THEN v_cantidad_base := NEW.cantidad * v_contenido; ELSE v_cantidad_base := NEW.cantidad; END IF;
  IF v_cantidad_base <= 0 THEN RETURN NEW; END IF;
  SELECT COALESCE(sa.cantidad, 0) INTO v_cantidad_anterior FROM stock_actual sa WHERE sa.branch_id = v_branch_id AND sa.insumo_id = NEW.insumo_id;
  INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad) VALUES (v_branch_id, NEW.insumo_id, v_cantidad_base, v_unidad_base)
  ON CONFLICT (branch_id, insumo_id) DO UPDATE SET cantidad = stock_actual.cantidad + v_cantidad_base, updated_at = NOW();
  v_cantidad_nueva := COALESCE(v_cantidad_anterior, 0) + v_cantidad_base;
  INSERT INTO stock_movimientos (branch_id, insumo_id, tipo, cantidad, cantidad_anterior, cantidad_nueva, factura_proveedor_id, motivo)
  VALUES (v_branch_id, NEW.insumo_id, 'compra', v_cantidad_base, COALESCE(v_cantidad_anterior, 0), v_cantidad_nueva, NEW.factura_id, 'Compra factura proveedor');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sumar_stock_compra ON items_factura;
CREATE TRIGGER trg_sumar_stock_compra AFTER INSERT ON items_factura FOR EACH ROW WHEN (NEW.insumo_id IS NOT NULL) EXECUTE FUNCTION public.sumar_stock_desde_compra();


-- ===== BLOQUE 9: Cierre mensual de stock =====
CREATE TABLE IF NOT EXISTS public.stock_cierre_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  periodo DATE NOT NULL,
  stock_apertura DECIMAL(10,3) NOT NULL DEFAULT 0,
  compras DECIMAL(10,3) NOT NULL DEFAULT 0,
  consumo_ventas DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_esperado DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_cierre_fisico DECIMAL(10,3) NOT NULL,
  merma DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(branch_id, insumo_id, periodo)
);
CREATE INDEX IF NOT EXISTS idx_stock_cierre_branch_periodo ON stock_cierre_mensual(branch_id, periodo);
CREATE INDEX IF NOT EXISTS idx_stock_cierre_insumo ON stock_cierre_mensual(insumo_id);
COMMENT ON TABLE public.stock_cierre_mensual IS 'Cierre mensual de stock por insumo: apertura, compras, ventas, esperado, físico y merma';
ALTER TABLE stock_cierre_mensual ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage stock_cierre_mensual" ON stock_cierre_mensual;
CREATE POLICY "Staff can manage stock_cierre_mensual" ON stock_cierre_mensual FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
