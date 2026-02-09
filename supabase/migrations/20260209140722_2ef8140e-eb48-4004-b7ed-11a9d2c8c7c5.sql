
-- =============================================
-- MIGRACIÓN 2: TABLAS TRANSACCIONALES
-- =============================================

-- =============================================
-- MÓDULO 3: COMPRAS
-- =============================================
CREATE TABLE compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  tipo_compra tipo_compra_enum DEFAULT 'normal',
  motivo_extraordinaria TEXT,
  compra_original_id UUID REFERENCES compras(id),
  fecha DATE NOT NULL,
  cantidad NUMERIC(10,3) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  factura_tipo VARCHAR(1),
  factura_numero VARCHAR(50),
  factura_fecha DATE,
  factura_url TEXT,
  condicion_pago VARCHAR(20) DEFAULT 'contado' CHECK (condicion_pago IN ('contado', 'cuenta_corriente')),
  medio_pago VARCHAR(20),
  fecha_vencimiento DATE,
  estado_pago VARCHAR(20) DEFAULT 'pagado' CHECK (estado_pago IN ('pendiente', 'pagado', 'vencido')),
  saldo_pendiente NUMERIC(12,2) DEFAULT 0,
  afecta_costo_base BOOLEAN DEFAULT TRUE,
  categoria_pl VARCHAR(50),
  periodo VARCHAR(7) NOT NULL, -- YYYY-MM
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_cantidad_positiva_normal CHECK (
    (tipo_compra = 'normal' AND cantidad > 0) OR (tipo_compra != 'normal')
  ),
  CONSTRAINT chk_motivo_extraordinaria CHECK (
    (tipo_compra = 'extraordinaria' AND motivo_extraordinaria IS NOT NULL) OR (tipo_compra != 'extraordinaria')
  ),
  CONSTRAINT chk_devolucion_referencia CHECK (
    (tipo_compra = 'devolucion' AND compra_original_id IS NOT NULL AND cantidad < 0) OR (tipo_compra != 'devolucion')
  ),
  CONSTRAINT chk_saldo_logico CHECK (
    (condicion_pago = 'contado' AND saldo_pendiente = 0) OR (condicion_pago = 'cuenta_corriente')
  )
);

CREATE INDEX idx_compras_branch_periodo ON compras(branch_id, periodo) WHERE deleted_at IS NULL;
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_compras_insumo ON compras(insumo_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_compras_fecha ON compras(fecha DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_compras_estado_pago ON compras(estado_pago) WHERE deleted_at IS NULL AND estado_pago != 'pagado';
CREATE INDEX idx_compras_tipo ON compras(tipo_compra) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 4: PAGOS A PROVEEDORES
-- =============================================
CREATE TABLE pagos_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  compra_id UUID REFERENCES compras(id),
  fecha_pago DATE NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  medio_pago VARCHAR(50) NOT NULL,
  referencia VARCHAR(100),
  datos_pago JSONB,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pagos_compra ON pagos_proveedores(compra_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pagos_proveedor ON pagos_proveedores(proveedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pagos_fecha ON pagos_proveedores(fecha_pago DESC) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 5: GASTOS
-- =============================================
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  periodo VARCHAR(7) NOT NULL,
  categoria_principal VARCHAR(50) NOT NULL CHECK (
    categoria_principal IN (
      'costos_laborales', 'servicios_infraestructura', 'admin_gestion',
      'impuestos', 'comisiones', 'financieros', 'comercializacion', 'publicidad_local'
    )
  ),
  subcategoria VARCHAR(50),
  concepto VARCHAR(200) NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  fecha DATE NOT NULL,
  detalle JSONB,
  medio_pago VARCHAR(50),
  referencia_pago VARCHAR(100),
  adjuntos JSONB,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'pagado' CHECK (estado IN ('borrador', 'pendiente', 'pagado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gastos_branch_periodo ON gastos(branch_id, periodo) WHERE deleted_at IS NULL;
CREATE INDEX idx_gastos_categoria ON gastos(categoria_principal, subcategoria) WHERE deleted_at IS NULL;
CREATE INDEX idx_gastos_fecha ON gastos(fecha DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_gastos_estado ON gastos(estado) WHERE deleted_at IS NULL AND estado != 'pagado';

-- =============================================
-- MÓDULO 6: VENTAS MENSUALES LOCAL
-- =============================================
CREATE TABLE ventas_mensuales_local (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  periodo VARCHAR(7) NOT NULL,
  fc_total NUMERIC(12,2) NOT NULL CHECK (fc_total >= 0),
  ft_total NUMERIC(12,2) NOT NULL CHECK (ft_total >= 0),
  porcentaje_ft NUMERIC(5,2),
  fecha_carga TIMESTAMPTZ DEFAULT NOW(),
  cargado_por UUID, -- profiles.id
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(branch_id, periodo),
  CONSTRAINT chk_ft_menor_fc CHECK (ft_total <= fc_total)
);

CREATE INDEX idx_ventas_branch_periodo ON ventas_mensuales_local(branch_id, periodo DESC) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 6b: CANON LIQUIDACIONES
-- =============================================
CREATE TABLE canon_liquidaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  periodo VARCHAR(7) NOT NULL,
  ventas_id UUID REFERENCES ventas_mensuales_local(id),
  fc_total NUMERIC(12,2) NOT NULL,
  ft_total NUMERIC(12,2) NOT NULL,
  porcentaje_ft NUMERIC(5,2),
  canon_porcentaje NUMERIC(5,2) DEFAULT 4.5,
  canon_monto NUMERIC(12,2) NOT NULL,
  marketing_porcentaje NUMERIC(5,2) DEFAULT 0.5,
  marketing_monto NUMERIC(12,2) NOT NULL,
  total_canon NUMERIC(12,2) NOT NULL,
  pago_vt_sugerido NUMERIC(12,2),
  pago_ft_sugerido NUMERIC(12,2),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado_parcial', 'pagado')),
  saldo_pendiente NUMERIC(12,2),
  fecha_vencimiento DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(branch_id, periodo)
);

CREATE INDEX idx_canon_branch_periodo ON canon_liquidaciones(branch_id, periodo DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_canon_estado ON canon_liquidaciones(estado) WHERE deleted_at IS NULL AND estado != 'pagado';

-- =============================================
-- PAGOS DE CANON
-- =============================================
CREATE TABLE pagos_canon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canon_liquidacion_id UUID NOT NULL REFERENCES canon_liquidaciones(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  fecha_pago DATE NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  medio_pago VARCHAR(50) NOT NULL,
  referencia VARCHAR(100),
  datos_pago JSONB,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pagos_canon_liquidacion ON pagos_canon(canon_liquidacion_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pagos_canon_branch ON pagos_canon(branch_id) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 7: CONSUMOS MANUALES
-- =============================================
CREATE TABLE consumos_manuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  periodo VARCHAR(7) NOT NULL,
  categoria_pl VARCHAR(50) NOT NULL CHECK (
    categoria_pl IN (
      'cmv_alimentos', 'cmv_bebidas', 'cmv_descartables_producto',
      'gasto_limpieza', 'gasto_descartables_cocina', 'gasto_mantenimiento'
    )
  ),
  monto_consumido NUMERIC(12,2) NOT NULL CHECK (monto_consumido >= 0),
  tipo VARCHAR(20) DEFAULT 'manual' CHECK (tipo IN ('manual', 'calculado')),
  detalle JSONB,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(branch_id, periodo, categoria_pl)
);

CREATE INDEX idx_consumos_branch_periodo ON consumos_manuales(branch_id, periodo) WHERE deleted_at IS NULL;

-- =============================================
-- MOVIMIENTOS DE SOCIO
-- =============================================
CREATE TABLE movimientos_socio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id UUID NOT NULL REFERENCES socios(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  tipo VARCHAR(50) NOT NULL CHECK (
    tipo IN (
      'aporte_capital', 'prestamo_socio', 'devolucion_prestamo',
      'retiro_anticipado', 'retiro_utilidades', 'distribucion_utilidades'
    )
  ),
  fecha DATE NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  detalle JSONB,
  periodo VARCHAR(7),
  resultado_periodo NUMERIC(12,2),
  saldo_acumulado NUMERIC(12,2),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mov_socio_socio_fecha ON movimientos_socio(socio_id, fecha DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_mov_socio_periodo ON movimientos_socio(socio_id, periodo DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_mov_socio_tipo ON movimientos_socio(tipo) WHERE deleted_at IS NULL;

-- =============================================
-- DISTRIBUCIONES DE UTILIDADES
-- =============================================
CREATE TABLE distribuciones_utilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  periodo VARCHAR(7) NOT NULL,
  resultado_neto NUMERIC(12,2) NOT NULL,
  reserva_legal NUMERIC(12,2) DEFAULT 0,
  otras_reservas NUMERIC(12,2) DEFAULT 0,
  monto_distribuible NUMERIC(12,2) NOT NULL,
  fecha_distribucion DATE NOT NULL,
  distribuciones JSONB NOT NULL,
  procesado BOOLEAN DEFAULT FALSE,
  fecha_proceso TIMESTAMPTZ,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  deleted_at TIMESTAMPTZ,
  UNIQUE(branch_id, periodo)
);

CREATE INDEX idx_dist_util_branch_periodo ON distribuciones_utilidades(branch_id, periodo DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_dist_util_procesado ON distribuciones_utilidades(procesado) WHERE deleted_at IS NULL AND procesado = FALSE;

-- Enable RLS on all new tables
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_mensuales_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE canon_liquidaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_canon ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumos_manuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_socio ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuciones_utilidades ENABLE ROW LEVEL SECURITY;
