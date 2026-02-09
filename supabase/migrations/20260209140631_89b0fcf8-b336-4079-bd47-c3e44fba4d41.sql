
-- =============================================
-- MIGRACIÓN 1: TABLAS BASE FINANCIERAS
-- =============================================

-- Enum para tipo de compra
CREATE TYPE tipo_compra_enum AS ENUM ('normal', 'extraordinaria', 'devolucion');

-- =============================================
-- MÓDULO 1: CATEGORÍAS DE INSUMO
-- =============================================
CREATE TABLE categorias_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('critico', 'operativo')),
  descripcion TEXT,
  orden INTEGER,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_categorias_tipo ON categorias_insumo(tipo) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 2: PROVEEDORES (antes de insumos por FK circular)
-- =============================================
CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambito VARCHAR(20) NOT NULL DEFAULT 'marca' CHECK (ambito IN ('marca', 'local')),
  branch_id UUID REFERENCES branches(id),
  razon_social VARCHAR(200) NOT NULL,
  cuit VARCHAR(20),
  contacto VARCHAR(100),
  telefono VARCHAR(50),
  email VARCHAR(100),
  direccion TEXT,
  medios_pago_aceptados JSONB DEFAULT '[]'::jsonb,
  permite_cuenta_corriente BOOLEAN DEFAULT TRUE,
  dias_pago_habitual INTEGER DEFAULT 30,
  descuento_pago_contado NUMERIC(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id, sin FK directa a auth.users
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_ambito_local CHECK (
    (ambito = 'marca' AND branch_id IS NULL) OR
    (ambito = 'local' AND branch_id IS NOT NULL)
  )
);

CREATE INDEX idx_proveedores_branch ON proveedores(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_proveedores_ambito ON proveedores(ambito) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 1b: INSUMOS (depende de categorias_insumo y proveedores)
-- =============================================
CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  categoria_id UUID REFERENCES categorias_insumo(id),
  unidad_base VARCHAR(20) NOT NULL, -- 'kg', 'unidad', 'litro', etc
  categoria_pl VARCHAR(50), -- 'cmv_alimentos', 'cmv_bebidas', etc
  creado_por VARCHAR(20) DEFAULT 'marca',
  activo BOOLEAN DEFAULT TRUE,
  proveedor_sugerido_id UUID REFERENCES proveedores(id),
  precio_referencia NUMERIC(12,2),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_insumos_categoria ON insumos(categoria_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_insumos_activo ON insumos(activo) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 9: PERÍODOS
-- =============================================
CREATE TABLE periodos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  periodo VARCHAR(7) NOT NULL, -- YYYY-MM
  estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado', 'aprobado')),
  fecha_cierre TIMESTAMPTZ,
  cerrado_por UUID, -- profiles.id
  motivo_cierre TEXT,
  fecha_aprobacion TIMESTAMPTZ,
  aprobado_por UUID, -- profiles.id
  fecha_reapertura TIMESTAMPTZ,
  reabierto_por UUID, -- profiles.id
  motivo_reapertura TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, periodo)
);

CREATE INDEX idx_periodos_branch_estado ON periodos(branch_id, estado);
CREATE INDEX idx_periodos_periodo ON periodos(periodo DESC);

-- =============================================
-- MÓDULO 10: CONFIGURACIÓN DE IMPUESTOS
-- =============================================
CREATE TABLE configuracion_impuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  iibb_alicuota NUMERIC(5,2) NOT NULL,
  tasas_municipales NUMERIC(5,2) DEFAULT 0,
  otros_impuestos JSONB,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_vigencia CHECK (vigencia_hasta IS NULL OR vigencia_hasta > vigencia_desde)
);

CREATE INDEX idx_config_imp_branch_vigencia ON configuracion_impuestos(branch_id, vigencia_desde, vigencia_hasta) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 8: SOCIOS
-- =============================================
CREATE TABLE socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  user_id UUID, -- Vinculación opcional con profiles.id
  nombre VARCHAR(100) NOT NULL,
  cuit VARCHAR(20),
  email VARCHAR(100),
  telefono VARCHAR(50),
  porcentaje_participacion NUMERIC(5,2) NOT NULL CHECK (porcentaje_participacion > 0 AND porcentaje_participacion <= 100),
  fecha_ingreso DATE NOT NULL,
  fecha_salida DATE,
  limite_retiro_mensual NUMERIC(12,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- profiles.id
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_socios_branch ON socios(branch_id, activo) WHERE deleted_at IS NULL;
CREATE INDEX idx_socios_user ON socios(user_id) WHERE deleted_at IS NULL;

-- =============================================
-- MÓDULO 11: AUDITORÍA FINANCIERA
-- =============================================
CREATE TABLE financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla VARCHAR(50) NOT NULL,
  registro_id UUID NOT NULL,
  operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_antes JSONB,
  datos_despues JSONB,
  campos_modificados TEXT[],
  usuario_id UUID, -- profiles.id
  usuario_email TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT
);

CREATE INDEX idx_audit_fin_tabla_registro ON financial_audit_log(tabla, registro_id);
CREATE INDEX idx_audit_fin_usuario ON financial_audit_log(usuario_id);
CREATE INDEX idx_audit_fin_timestamp ON financial_audit_log(timestamp DESC);
CREATE INDEX idx_audit_fin_operacion ON financial_audit_log(operacion);

-- Enable RLS on all tables
ALTER TABLE categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_impuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;
