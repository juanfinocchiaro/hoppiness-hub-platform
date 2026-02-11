
-- =====================================================
-- MIGRACIÓN: Sistema de Menú y Centro de Costos
-- Sistema MONO-MARCA (sin brand_id)
-- =====================================================

-- ===================
-- CATEGORÍAS DEL MENÚ
-- ===================
CREATE TABLE IF NOT EXISTS menu_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar categorías por defecto
INSERT INTO menu_categorias (nombre, orden) VALUES
  ('Hamburguesas', 1),
  ('Acompañamientos', 2),
  ('Bebidas', 3),
  ('Postres', 4)
ON CONFLICT DO NOTHING;

-- ===================
-- PRODUCTOS DEL MENÚ
-- ===================
CREATE TABLE IF NOT EXISTS menu_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES menu_categorias(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  nombre_corto TEXT,
  descripcion TEXT,
  imagen_url TEXT,
  tipo TEXT NOT NULL DEFAULT 'elaborado',
  insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  disponible_delivery BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menu_productos_categoria ON menu_productos(categoria_id);
CREATE INDEX idx_menu_productos_tipo ON menu_productos(tipo);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION validate_menu_producto_tipo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo NOT IN ('elaborado', 'terminado', 'combo') THEN
    RAISE EXCEPTION 'tipo must be elaborado, terminado, or combo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_menu_producto_tipo
  BEFORE INSERT OR UPDATE ON menu_productos
  FOR EACH ROW EXECUTE FUNCTION validate_menu_producto_tipo();

-- ===================
-- FICHA TÉCNICA (RECETAS)
-- ===================
CREATE TABLE IF NOT EXISTS menu_fichas_tecnicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_producto_id UUID NOT NULL REFERENCES menu_productos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad DECIMAL(10,4) NOT NULL,
  unidad TEXT NOT NULL,
  notas TEXT,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fichas_producto ON menu_fichas_tecnicas(menu_producto_id);
CREATE INDEX idx_fichas_insumo ON menu_fichas_tecnicas(insumo_id);

ALTER TABLE menu_fichas_tecnicas 
ADD CONSTRAINT unique_producto_insumo UNIQUE (menu_producto_id, insumo_id);

-- ===================
-- COMBOS
-- ===================
CREATE TABLE IF NOT EXISTS menu_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES menu_productos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES menu_productos(id) ON DELETE RESTRICT,
  cantidad INT NOT NULL DEFAULT 1,
  es_intercambiable BOOLEAN DEFAULT false,
  categoria_intercambiable_id UUID REFERENCES menu_categorias(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_combos_combo ON menu_combos(combo_id);

-- Validation trigger for combo self-reference
CREATE OR REPLACE FUNCTION validate_combo_no_self_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.combo_id = NEW.producto_id THEN
    RAISE EXCEPTION 'A combo cannot contain itself';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_combo_no_self_ref
  BEFORE INSERT OR UPDATE ON menu_combos
  FOR EACH ROW EXECUTE FUNCTION validate_combo_no_self_ref();

-- ===================
-- CANALES DE VENTA
-- ===================
CREATE TABLE IF NOT EXISTS canales_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo_ajuste TEXT NOT NULL DEFAULT 'porcentaje',
  ajuste_valor DECIMAL(10,2) DEFAULT 0,
  es_base BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for tipo_ajuste
CREATE OR REPLACE FUNCTION validate_canal_tipo_ajuste()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_ajuste NOT IN ('porcentaje', 'fijo') THEN
    RAISE EXCEPTION 'tipo_ajuste must be porcentaje or fijo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_canal_tipo_ajuste
  BEFORE INSERT OR UPDATE ON canales_venta
  FOR EACH ROW EXECUTE FUNCTION validate_canal_tipo_ajuste();

INSERT INTO canales_venta (codigo, nombre, tipo_ajuste, ajuste_valor, es_base, orden) VALUES
  ('salon', 'Salón', 'porcentaje', 0, true, 1),
  ('takeaway', 'Take Away', 'porcentaje', 0, false, 2),
  ('delivery', 'Delivery Propio', 'porcentaje', 10, false, 3),
  ('rappi', 'Rappi', 'porcentaje', 30, false, 4),
  ('pedidosya', 'PedidosYa', 'porcentaje', 30, false, 5)
ON CONFLICT (codigo) DO NOTHING;

-- ===================
-- PRECIOS DEL MENÚ
-- ===================
CREATE TABLE IF NOT EXISTS menu_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_producto_id UUID NOT NULL REFERENCES menu_productos(id) ON DELETE CASCADE,
  precio_base DECIMAL(12,2) NOT NULL,
  fc_objetivo DECIMAL(5,2) DEFAULT 32,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_precio_producto UNIQUE (menu_producto_id)
);

CREATE INDEX idx_precios_producto ON menu_precios(menu_producto_id);

-- ===================
-- HISTORIAL DE PRECIOS
-- ===================
CREATE TABLE IF NOT EXISTS menu_precios_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_producto_id UUID NOT NULL REFERENCES menu_productos(id) ON DELETE CASCADE,
  precio_anterior DECIMAL(12,2),
  precio_nuevo DECIMAL(12,2) NOT NULL,
  motivo TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_precios_hist_producto ON menu_precios_historial(menu_producto_id);
CREATE INDEX idx_precios_hist_fecha ON menu_precios_historial(created_at DESC);

-- ===================
-- HISTORIAL DE COSTOS DE INSUMOS
-- ===================
CREATE TABLE IF NOT EXISTS insumos_costos_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  costo_anterior DECIMAL(12,4),
  costo_nuevo DECIMAL(12,4) NOT NULL,
  factura_id UUID REFERENCES facturas_proveedores(id),
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_costos_hist_insumo ON insumos_costos_historial(insumo_id);
CREATE INDEX idx_costos_hist_branch ON insumos_costos_historial(branch_id);
CREATE INDEX idx_costos_hist_fecha ON insumos_costos_historial(created_at DESC);

-- ===================
-- VISTA: Costo teórico de productos
-- ===================
CREATE OR REPLACE VIEW v_menu_costos AS
SELECT 
  mp.id AS menu_producto_id,
  mp.nombre,
  mp.tipo,
  mp.categoria_id,
  mc.nombre AS categoria_nombre,
  COALESCE(
    (SELECT SUM(
      ft.cantidad * 
      CASE ft.unidad
        WHEN 'kg' THEN i.costo_por_unidad_base * 1000
        WHEN 'g' THEN i.costo_por_unidad_base
        WHEN 'l' THEN i.costo_por_unidad_base * 1000
        WHEN 'ml' THEN i.costo_por_unidad_base
        ELSE i.costo_por_unidad_base
      END
    )
    FROM menu_fichas_tecnicas ft
    JOIN insumos i ON i.id = ft.insumo_id
    WHERE ft.menu_producto_id = mp.id),
    (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id),
    0
  ) AS costo_teorico,
  COALESCE(mpr.precio_base, 0) AS precio_base,
  COALESCE(mpr.fc_objetivo, 32) AS fc_objetivo,
  CASE 
    WHEN COALESCE(mpr.precio_base, 0) > 0 THEN
      ROUND((COALESCE(
        (SELECT SUM(ft.cantidad * 
          CASE ft.unidad
            WHEN 'kg' THEN i.costo_por_unidad_base * 1000
            WHEN 'g' THEN i.costo_por_unidad_base
            WHEN 'l' THEN i.costo_por_unidad_base * 1000
            WHEN 'ml' THEN i.costo_por_unidad_base
            ELSE i.costo_por_unidad_base
          END
        )
         FROM menu_fichas_tecnicas ft
         JOIN insumos i ON i.id = ft.insumo_id
         WHERE ft.menu_producto_id = mp.id),
        (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id),
        0
      ) / mpr.precio_base * 100)::numeric, 2)
    ELSE NULL
  END AS fc_actual,
  CASE 
    WHEN COALESCE(mpr.fc_objetivo, 32) > 0 THEN
      ROUND((COALESCE(
        (SELECT SUM(ft.cantidad * 
          CASE ft.unidad
            WHEN 'kg' THEN i.costo_por_unidad_base * 1000
            WHEN 'g' THEN i.costo_por_unidad_base
            WHEN 'l' THEN i.costo_por_unidad_base * 1000
            WHEN 'ml' THEN i.costo_por_unidad_base
            ELSE i.costo_por_unidad_base
          END
        )
         FROM menu_fichas_tecnicas ft
         JOIN insumos i ON i.id = ft.insumo_id
         WHERE ft.menu_producto_id = mp.id),
        (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id),
        0
      ) / (mpr.fc_objetivo / 100))::numeric, 0)
    ELSE NULL
  END AS precio_sugerido
FROM menu_productos mp
LEFT JOIN menu_categorias mc ON mc.id = mp.categoria_id
LEFT JOIN menu_precios mpr ON mpr.menu_producto_id = mp.id
WHERE mp.activo = true;

-- ===================
-- FUNCIÓN: Actualizar costo de insumo desde compra
-- ===================
CREATE OR REPLACE FUNCTION fn_actualizar_costo_insumo_desde_compra()
RETURNS TRIGGER AS $$
DECLARE
  v_costo_anterior DECIMAL(12,4);
  v_costo_nuevo DECIMAL(12,4);
  v_contenido INT;
BEGIN
  IF NEW.insumo_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT costo_por_unidad_base INTO v_costo_anterior
  FROM insumos WHERE id = NEW.insumo_id;
  
  SELECT unidad_compra_contenido INTO v_contenido
  FROM insumos WHERE id = NEW.insumo_id;
  
  IF v_contenido > 0 THEN
    v_costo_nuevo := NEW.precio_unitario / v_contenido;
  ELSE
    v_costo_nuevo := NEW.precio_unitario;
  END IF;
  
  IF v_costo_anterior IS DISTINCT FROM v_costo_nuevo THEN
    UPDATE insumos 
    SET costo_por_unidad_base = v_costo_nuevo,
        updated_at = now()
    WHERE id = NEW.insumo_id;
    
    INSERT INTO insumos_costos_historial (
      insumo_id, branch_id, costo_anterior, costo_nuevo, factura_id, motivo
    ) VALUES (
      NEW.insumo_id,
      (SELECT branch_id FROM facturas_proveedores WHERE id = NEW.factura_id),
      v_costo_anterior,
      v_costo_nuevo,
      NEW.factura_id,
      'Actualización automática desde compra'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_actualizar_costo_insumo ON items_factura;
CREATE TRIGGER trg_actualizar_costo_insumo
  AFTER INSERT ON items_factura
  FOR EACH ROW
  WHEN (NEW.insumo_id IS NOT NULL)
  EXECUTE FUNCTION fn_actualizar_costo_insumo_desde_compra();

-- ===================
-- RLS POLICIES
-- ===================
ALTER TABLE menu_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_categorias_select" ON menu_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_categorias_modify" ON menu_categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE menu_productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_productos_select" ON menu_productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_productos_insert" ON menu_productos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "menu_productos_update" ON menu_productos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "menu_productos_delete" ON menu_productos FOR DELETE TO authenticated USING (true);

ALTER TABLE menu_fichas_tecnicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_fichas_select" ON menu_fichas_tecnicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_fichas_modify" ON menu_fichas_tecnicas FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE menu_combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_combos_select" ON menu_combos FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_combos_modify" ON menu_combos FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE canales_venta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canales_venta_select" ON canales_venta FOR SELECT TO authenticated USING (true);
CREATE POLICY "canales_venta_modify" ON canales_venta FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE menu_precios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_precios_select" ON menu_precios FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_precios_modify" ON menu_precios FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE menu_precios_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_precios_hist_select" ON menu_precios_historial FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_precios_hist_insert" ON menu_precios_historial FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE insumos_costos_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insumos_costos_hist_select" ON insumos_costos_historial FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos_costos_hist_insert" ON insumos_costos_historial FOR INSERT TO authenticated WITH CHECK (true);
