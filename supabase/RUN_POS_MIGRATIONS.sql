-- =============================================
-- EJECUTAR EN SUPABASE DASHBOARD > SQL Editor
-- Copiá todo y ejecutá en una sola corrida
-- =============================================

-- =============================================
-- 1/3 - POS Tablas principales
-- =============================================

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

-- POS_CONFIG (la que necesitás para el toggle)
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

-- RLS
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
