-- =============================================
-- POS - Stock, movimientos, cadetes, llamadores
-- =============================================

-- STOCK_ACTUAL
CREATE TABLE public.stock_actual (
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

CREATE INDEX idx_stock_branch ON stock_actual(branch_id);

-- STOCK_MOVIMIENTOS
CREATE TABLE public.stock_movimientos (
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

CREATE INDEX idx_stock_mov_branch_insumo ON stock_movimientos(branch_id, insumo_id);
CREATE INDEX idx_stock_mov_fecha ON stock_movimientos(created_at);

-- CADETES
CREATE TABLE public.cadetes (
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

CREATE INDEX idx_cadetes_branch ON cadetes(branch_id);

-- LLAMADORES
CREATE TABLE public.llamadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  numero INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 99),

  en_uso BOOLEAN DEFAULT FALSE,
  pedido_id UUID REFERENCES pedidos(id),
  asignado_at TIMESTAMPTZ,

  UNIQUE(branch_id, numero)
);

CREATE INDEX idx_llamadores_branch ON llamadores(branch_id);

-- RLS
ALTER TABLE stock_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage stock_actual" ON stock_actual FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

CREATE POLICY "Staff can manage stock_movimientos" ON stock_movimientos FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

CREATE POLICY "Staff can manage cadetes" ON cadetes FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

CREATE POLICY "Staff can manage llamadores" ON llamadores FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
