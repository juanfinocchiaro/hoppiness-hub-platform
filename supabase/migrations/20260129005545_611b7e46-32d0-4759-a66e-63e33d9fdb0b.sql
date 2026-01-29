-- Eliminar tablas antiguas
DROP TABLE IF EXISTS daily_sales CASCADE;
DROP TABLE IF EXISTS shift_closures CASCADE;

-- Crear nueva tabla de cierres
CREATE TABLE shift_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('mañana', 'mediodía', 'noche', 'trasnoche')),
  
  -- JSONB para datos flexibles
  hamburguesas JSONB NOT NULL DEFAULT '{}',
  ventas_local JSONB NOT NULL DEFAULT '{}',
  ventas_apps JSONB NOT NULL DEFAULT '{}',
  
  -- Facturación
  total_facturado DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Totales calculados
  total_hamburguesas INT NOT NULL DEFAULT 0,
  total_vendido DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_efectivo DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_digital DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Validaciones
  facturacion_esperada DECIMAL(12,2) NOT NULL DEFAULT 0,
  facturacion_diferencia DECIMAL(12,2) NOT NULL DEFAULT 0,
  tiene_alerta_facturacion BOOLEAN NOT NULL DEFAULT false,
  
  -- Notas
  notas TEXT,
  
  -- Metadata
  cerrado_por UUID NOT NULL REFERENCES auth.users(id),
  cerrado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE (branch_id, fecha, turno)
);

-- Índices
CREATE INDEX idx_shift_closures_branch ON shift_closures(branch_id);
CREATE INDEX idx_shift_closures_fecha ON shift_closures(fecha);
CREATE INDEX idx_shift_closures_branch_fecha ON shift_closures(branch_id, fecha);

-- Tabla de configuración de marca
CREATE TABLE brand_closure_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('categoria_hamburguesa', 'tipo_hamburguesa', 'extra', 'app_delivery')),
  clave TEXT NOT NULL,
  etiqueta TEXT NOT NULL,
  categoria_padre TEXT,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE (tipo, clave)
);

-- Tabla de configuración por local
CREATE TABLE branch_closure_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES brand_closure_config(id) ON DELETE CASCADE,
  habilitado BOOLEAN DEFAULT true,
  UNIQUE (branch_id, config_id)
);

-- Datos iniciales - Categorías de hamburguesas
INSERT INTO brand_closure_config (tipo, clave, etiqueta, orden) VALUES
  ('categoria_hamburguesa', 'clasicas', 'Clásicas', 1),
  ('categoria_hamburguesa', 'originales', 'Originales', 2),
  ('categoria_hamburguesa', 'mas_sabor', 'Más Sabor', 3),
  ('categoria_hamburguesa', 'veggies', 'Veggies', 4),
  ('categoria_hamburguesa', 'ultrasmash', 'Ultrasmash', 5);

-- Tipos individuales (solo para Veggies y Ultrasmash)
INSERT INTO brand_closure_config (tipo, clave, etiqueta, categoria_padre, orden) VALUES
  ('tipo_hamburguesa', 'not_american', 'Not American', 'veggies', 1),
  ('tipo_hamburguesa', 'not_claudio', 'Not Claudio', 'veggies', 2),
  ('tipo_hamburguesa', 'ultra_cheese', 'Ultra Cheese', 'ultrasmash', 1),
  ('tipo_hamburguesa', 'ultra_bacon', 'Ultra Bacon', 'ultrasmash', 2);

-- Extras
INSERT INTO brand_closure_config (tipo, clave, etiqueta, orden) VALUES
  ('extra', 'extra_carne', 'Extra Carne c/Queso', 1),
  ('extra', 'extra_not_burger', 'Extra Not Burger', 2),
  ('extra', 'extra_not_chicken', 'Extra Not Chicken', 3);

-- Apps de delivery
INSERT INTO brand_closure_config (tipo, clave, etiqueta, orden) VALUES
  ('app_delivery', 'mas_delivery', 'Más Delivery', 1),
  ('app_delivery', 'rappi', 'Rappi', 2),
  ('app_delivery', 'pedidosya', 'PedidosYa', 3),
  ('app_delivery', 'mp_delivery', 'MP Delivery', 4);

-- RLS
ALTER TABLE shift_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_closure_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_closure_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shift_closures
CREATE POLICY "Users can view closures for their branches"
  ON shift_closures FOR SELECT TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Staff can insert closures"
  ON shift_closures FOR INSERT TO authenticated
  WITH CHECK (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Staff can update closures"
  ON shift_closures FOR UPDATE TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

-- Políticas para brand_closure_config
CREATE POLICY "Anyone authenticated can view config"
  ON brand_closure_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only superadmin can modify config"
  ON brand_closure_config FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));

-- Políticas para branch_closure_config
CREATE POLICY "Users can view their branch config"
  ON branch_closure_config FOR SELECT TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Managers can modify branch config"
  ON branch_closure_config FOR ALL TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_shift_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_shift_closures_updated_at
  BEFORE UPDATE ON shift_closures
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_closures_updated_at();