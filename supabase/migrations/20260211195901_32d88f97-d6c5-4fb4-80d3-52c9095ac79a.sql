
-- ============================================================
-- SISTEMA DE 3 CAPAS PARA PRODUCTOS GASTRONÓMICOS
-- Capa 1: insumos (ya existe)
-- Capa 2: preparaciones + preparacion_ingredientes + preparacion_opciones
-- Capa 3: items_carta + item_carta_composicion + item_carta_precios_historial
-- ============================================================

-- ═══ CAPA 2: PREPARACIONES ═══

CREATE TABLE public.preparaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL DEFAULT 'elaborado', -- 'elaborado' | 'componente_terminado'
  es_intercambiable BOOLEAN DEFAULT false,
  metodo_costeo TEXT DEFAULT 'promedio', -- 'promedio' | 'mas_caro' | 'manual'
  costo_manual DECIMAL(12,2),
  costo_calculado DECIMAL(12,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.preparacion_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparacion_id UUID NOT NULL REFERENCES preparaciones(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  cantidad DECIMAL(10,4) NOT NULL,
  unidad TEXT NOT NULL DEFAULT 'g',
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.preparacion_opciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparacion_id UUID NOT NULL REFERENCES preparaciones(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for Capa 2
CREATE INDEX idx_preparacion_ingredientes_prep ON preparacion_ingredientes(preparacion_id);
CREATE INDEX idx_preparacion_opciones_prep ON preparacion_opciones(preparacion_id);
CREATE INDEX idx_preparaciones_activo ON preparaciones(activo) WHERE activo = true AND deleted_at IS NULL;

-- ═══ CAPA 3: ITEMS DE CARTA ═══

-- Rename categories for clarity (keep same table, just add context)
-- menu_categorias stays as-is since it's already used

CREATE TABLE public.items_carta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nombre_corto TEXT,
  descripcion TEXT,
  imagen_url TEXT,
  categoria_carta_id UUID REFERENCES menu_categorias(id),
  rdo_category_code TEXT REFERENCES rdo_categories(code),
  precio_base DECIMAL(12,2) NOT NULL DEFAULT 0,
  fc_objetivo DECIMAL(5,2) DEFAULT 32,
  costo_total DECIMAL(12,2) DEFAULT 0,
  fc_actual DECIMAL(5,2),
  activo BOOLEAN DEFAULT true,
  disponible_delivery BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.item_carta_composicion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_carta_id UUID NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  preparacion_id UUID REFERENCES preparaciones(id),
  insumo_id UUID REFERENCES insumos(id),
  cantidad INT NOT NULL DEFAULT 1,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT composicion_valida CHECK (
    (preparacion_id IS NOT NULL AND insumo_id IS NULL) OR
    (preparacion_id IS NULL AND insumo_id IS NOT NULL)
  )
);

CREATE TABLE public.item_carta_precios_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_carta_id UUID NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  precio_anterior DECIMAL(12,2),
  precio_nuevo DECIMAL(12,2) NOT NULL,
  motivo TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for Capa 3
CREATE INDEX idx_items_carta_activo ON items_carta(activo) WHERE activo = true AND deleted_at IS NULL;
CREATE INDEX idx_items_carta_categoria ON items_carta(categoria_carta_id);
CREATE INDEX idx_item_carta_composicion_item ON item_carta_composicion(item_carta_id);
CREATE INDEX idx_item_carta_precios_hist ON item_carta_precios_historial(item_carta_id);

-- ═══ TRIGGER: auto update updated_at ═══

CREATE TRIGGER update_preparaciones_updated_at
  BEFORE UPDATE ON preparaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_carta_updated_at
  BEFORE UPDATE ON items_carta
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══ FUNCTION: Recalculate preparacion cost ═══

CREATE OR REPLACE FUNCTION public.recalcular_costo_preparacion(_prep_id uuid)
RETURNS DECIMAL(12,2) 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_costo DECIMAL(12,2) := 0;
  v_tipo TEXT;
  v_es_inter BOOLEAN;
  v_metodo TEXT;
  v_costo_manual DECIMAL(12,2);
BEGIN
  SELECT tipo, es_intercambiable, metodo_costeo, costo_manual
  INTO v_tipo, v_es_inter, v_metodo, v_costo_manual
  FROM preparaciones WHERE id = _prep_id;

  IF v_tipo = 'elaborado' THEN
    -- Sum cost from ingredients
    SELECT COALESCE(SUM(
      pi.cantidad * i.costo_por_unidad_base * 
      CASE WHEN pi.unidad IN ('kg', 'l') THEN 1000 ELSE 1 END
    ), 0)
    INTO v_costo
    FROM preparacion_ingredientes pi
    JOIN insumos i ON i.id = pi.insumo_id
    WHERE pi.preparacion_id = _prep_id;

  ELSIF v_tipo = 'componente_terminado' THEN
    IF v_costo_manual IS NOT NULL THEN
      v_costo := v_costo_manual;
    ELSIF v_es_inter THEN
      -- Average/max from options
      IF v_metodo = 'mas_caro' THEN
        SELECT COALESCE(MAX(i.costo_por_unidad_base), 0)
        INTO v_costo
        FROM preparacion_opciones po
        JOIN insumos i ON i.id = po.insumo_id
        WHERE po.preparacion_id = _prep_id;
      ELSE
        SELECT COALESCE(AVG(i.costo_por_unidad_base), 0)
        INTO v_costo
        FROM preparacion_opciones po
        JOIN insumos i ON i.id = po.insumo_id
        WHERE po.preparacion_id = _prep_id;
      END IF;
    ELSE
      -- Single option from first ingredient
      SELECT COALESCE(i.costo_por_unidad_base, 0)
      INTO v_costo
      FROM preparacion_ingredientes pi
      JOIN insumos i ON i.id = pi.insumo_id
      WHERE pi.preparacion_id = _prep_id
      ORDER BY pi.orden LIMIT 1;
    END IF;
  END IF;

  UPDATE preparaciones SET costo_calculado = v_costo WHERE id = _prep_id;
  RETURN v_costo;
END;
$$;

-- ═══ FUNCTION: Recalculate item_carta cost ═══

CREATE OR REPLACE FUNCTION public.recalcular_costo_item_carta(_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_costo DECIMAL(12,2) := 0;
  v_precio DECIMAL(12,2);
BEGIN
  -- Sum from composition
  SELECT COALESCE(SUM(
    ic.cantidad * COALESCE(
      p.costo_calculado,
      i.costo_por_unidad_base,
      0
    )
  ), 0)
  INTO v_costo
  FROM item_carta_composicion ic
  LEFT JOIN preparaciones p ON p.id = ic.preparacion_id
  LEFT JOIN insumos i ON i.id = ic.insumo_id
  WHERE ic.item_carta_id = _item_id;

  SELECT precio_base INTO v_precio FROM items_carta WHERE id = _item_id;

  UPDATE items_carta 
  SET costo_total = v_costo,
      fc_actual = CASE WHEN v_precio > 0 THEN ROUND((v_costo / v_precio * 100)::numeric, 2) ELSE NULL END
  WHERE id = _item_id;
END;
$$;

-- ═══ RLS POLICIES ═══

ALTER TABLE preparaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparacion_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparacion_opciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_carta ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_carta_composicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_carta_precios_historial ENABLE ROW LEVEL SECURITY;

-- Staff can read all menu-related tables
CREATE POLICY "Staff can read preparaciones" ON preparaciones FOR SELECT USING (is_staff());
CREATE POLICY "Staff can read preparacion_ingredientes" ON preparacion_ingredientes FOR SELECT USING (is_staff());
CREATE POLICY "Staff can read preparacion_opciones" ON preparacion_opciones FOR SELECT USING (is_staff());
CREATE POLICY "Staff can read items_carta" ON items_carta FOR SELECT USING (is_staff());
CREATE POLICY "Staff can read item_carta_composicion" ON item_carta_composicion FOR SELECT USING (is_staff());
CREATE POLICY "Staff can read item_carta_precios_historial" ON item_carta_precios_historial FOR SELECT USING (is_staff());

-- Superadmin can manage all
CREATE POLICY "Superadmin manages preparaciones" ON preparaciones FOR ALL USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages preparacion_ingredientes" ON preparacion_ingredientes FOR ALL USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages preparacion_opciones" ON preparacion_opciones FOR ALL USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages items_carta" ON items_carta FOR ALL USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages item_carta_composicion" ON item_carta_composicion FOR ALL USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages item_carta_precios_historial" ON item_carta_precios_historial FOR ALL USING (is_superadmin(auth.uid()));
