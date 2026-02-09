
-- RDO MOVIMIENTOS
CREATE TABLE public.rdo_movimientos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id),
  periodo TEXT NOT NULL,
  rdo_category_code TEXT NOT NULL REFERENCES rdo_categories(code),
  origen TEXT NOT NULL CHECK (origen IN ('consumo_inventario','compra_directa','gasto_servicio','comision_plataforma','fee_marca','nomina','manual')),
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  descripcion TEXT,
  datos_extra JSONB,
  source_table TEXT,
  source_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_rdo_mov_bp ON rdo_movimientos(branch_id, periodo);
CREATE INDEX idx_rdo_mov_cat ON rdo_movimientos(rdo_category_code);
CREATE INDEX idx_rdo_mov_src ON rdo_movimientos(source_table, source_id);
CREATE UNIQUE INDEX idx_rdo_mov_uniq ON rdo_movimientos(source_table, source_id) WHERE deleted_at IS NULL AND source_id IS NOT NULL;
CREATE TRIGGER update_rdo_mov_ts BEFORE UPDATE ON rdo_movimientos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE rdo_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rv" ON rdo_movimientos FOR SELECT USING (has_financial_access(branch_id));
CREATE POLICY "ri" ON rdo_movimientos FOR INSERT WITH CHECK (has_financial_access(branch_id));
CREATE POLICY "ru" ON rdo_movimientos FOR UPDATE USING (has_financial_access(branch_id));
CREATE POLICY "rd" ON rdo_movimientos FOR DELETE USING (has_financial_access(branch_id));

-- INVERSIONES
CREATE TABLE public.inversiones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id),
  descripcion TEXT NOT NULL,
  tipo_inversion TEXT NOT NULL CHECK (tipo_inversion IN ('equipamiento','mobiliario','obra_civil','tecnologia','vehiculo','franquicia','garantia','otro')),
  monto_total NUMERIC(12,2) NOT NULL,
  fecha DATE NOT NULL,
  periodo TEXT NOT NULL,
  vida_util_meses INTEGER,
  estado TEXT NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado','pendiente','financiado')),
  cuotas_total INTEGER,
  cuotas_pagadas INTEGER DEFAULT 0,
  observaciones TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_inv_bp ON inversiones(branch_id, periodo);
CREATE TRIGGER update_inv_ts BEFORE UPDATE ON inversiones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE inversiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iv" ON inversiones FOR SELECT USING (has_financial_access(branch_id));
CREATE POLICY "ii" ON inversiones FOR INSERT WITH CHECK (has_financial_access(branch_id));
CREATE POLICY "iu" ON inversiones FOR UPDATE USING (has_financial_access(branch_id));
CREATE POLICY "id_pol" ON inversiones FOR DELETE USING (has_financial_access(branch_id));

-- SYNC gastos
CREATE OR REPLACE FUNCTION public.sync_gasto_to_rdo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'gastos' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;
  IF NEW.deleted_at IS NOT NULL OR NEW.rdo_category_code IS NULL THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'gastos' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;
  DELETE FROM rdo_movimientos WHERE source_table = 'gastos' AND source_id = NEW.id AND deleted_at IS NULL;
  INSERT INTO rdo_movimientos (branch_id, periodo, rdo_category_code, origen, monto, descripcion, source_table, source_id, created_by)
  VALUES (NEW.branch_id, NEW.periodo, NEW.rdo_category_code, 'gasto_servicio', NEW.monto, NEW.concepto, 'gastos', NEW.id, NEW.created_by);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_gasto_rdo AFTER INSERT OR UPDATE OR DELETE ON gastos FOR EACH ROW EXECUTE FUNCTION sync_gasto_to_rdo();

-- SYNC items_factura
CREATE OR REPLACE FUNCTION public.sync_item_factura_to_rdo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_branch_id UUID; v_periodo TEXT; v_rdo_code TEXT; v_deleted TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'items_factura' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;
  SELECT f.branch_id, f.periodo, f.deleted_at INTO v_branch_id, v_periodo, v_deleted FROM facturas_proveedores f WHERE f.id = NEW.factura_id;
  IF NEW.insumo_id IS NOT NULL THEN SELECT rdo_category_code INTO v_rdo_code FROM insumos WHERE id = NEW.insumo_id;
  ELSIF NEW.concepto_servicio_id IS NOT NULL THEN SELECT rdo_category_code INTO v_rdo_code FROM conceptos_servicio WHERE id = NEW.concepto_servicio_id;
  END IF;
  IF v_rdo_code IS NULL THEN v_rdo_code := NEW.categoria_pl; END IF;
  IF v_rdo_code IS NULL OR v_deleted IS NOT NULL THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'items_factura' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM rdo_categories WHERE code = v_rdo_code) THEN RETURN NEW; END IF;
  DELETE FROM rdo_movimientos WHERE source_table = 'items_factura' AND source_id = NEW.id AND deleted_at IS NULL;
  INSERT INTO rdo_movimientos (branch_id, periodo, rdo_category_code, origen, monto, source_table, source_id)
  VALUES (v_branch_id, v_periodo, v_rdo_code, 'compra_directa', NEW.subtotal, 'items_factura', NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_item_rdo AFTER INSERT OR UPDATE OR DELETE ON items_factura FOR EACH ROW EXECUTE FUNCTION sync_item_factura_to_rdo();

-- SYNC consumos_manuales
CREATE OR REPLACE FUNCTION public.sync_consumo_to_rdo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_rdo_code TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'consumos_manuales' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;
  IF NEW.deleted_at IS NOT NULL THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'consumos_manuales' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;
  v_rdo_code := CASE NEW.categoria_pl WHEN 'materia_prima' THEN 'cmv_hamburguesas' WHEN 'descartables' THEN 'descartables_salon' WHEN 'limpieza' THEN 'limpieza_higiene' WHEN 'mantenimiento' THEN 'mantenimiento' WHEN 'marketing' THEN 'marketing' ELSE NULL END;
  IF v_rdo_code IS NULL THEN RETURN NEW; END IF;
  DELETE FROM rdo_movimientos WHERE source_table = 'consumos_manuales' AND source_id = NEW.id AND deleted_at IS NULL;
  INSERT INTO rdo_movimientos (branch_id, periodo, rdo_category_code, origen, monto, descripcion, source_table, source_id, created_by)
  VALUES (NEW.branch_id, NEW.periodo, v_rdo_code, 'consumo_inventario', NEW.monto_consumido, NEW.observaciones, 'consumos_manuales', NEW.id, NEW.created_by);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_consumo_rdo AFTER INSERT OR UPDATE OR DELETE ON consumos_manuales FOR EACH ROW EXECUTE FUNCTION sync_consumo_to_rdo();

-- UPDATE VIEW
DROP VIEW IF EXISTS rdo_report_data;
CREATE VIEW rdo_report_data AS
SELECT branch_id, periodo, rdo_category_code, SUM(monto) as total
FROM rdo_movimientos WHERE deleted_at IS NULL GROUP BY branch_id, periodo, rdo_category_code;

-- BACKFILL from items_factura
INSERT INTO rdo_movimientos (branch_id, periodo, rdo_category_code, origen, monto, source_table, source_id)
SELECT f.branch_id, f.periodo, COALESCE(i.rdo_category_code, cs.rdo_category_code, it.categoria_pl),
  'compra_directa', it.subtotal, 'items_factura', it.id
FROM items_factura it JOIN facturas_proveedores f ON f.id = it.factura_id
LEFT JOIN insumos i ON i.id = it.insumo_id LEFT JOIN conceptos_servicio cs ON cs.id = it.concepto_servicio_id
WHERE f.deleted_at IS NULL AND COALESCE(i.rdo_category_code, cs.rdo_category_code, it.categoria_pl) IS NOT NULL
  AND EXISTS (SELECT 1 FROM rdo_categories WHERE code = COALESCE(i.rdo_category_code, cs.rdo_category_code, it.categoria_pl));

-- BACKFILL from gastos
INSERT INTO rdo_movimientos (branch_id, periodo, rdo_category_code, origen, monto, descripcion, source_table, source_id, created_by)
SELECT g.branch_id, g.periodo, g.rdo_category_code, 'gasto_servicio', g.monto, g.concepto, 'gastos', g.id, g.created_by
FROM gastos g WHERE g.deleted_at IS NULL AND g.rdo_category_code IS NOT NULL
  AND EXISTS (SELECT 1 FROM rdo_categories WHERE code = g.rdo_category_code);

-- BACKFILL from consumos_manuales
INSERT INTO rdo_movimientos (branch_id, periodo, rdo_category_code, origen, monto, descripcion, source_table, source_id, created_by)
SELECT cm.branch_id, cm.periodo,
  CASE cm.categoria_pl WHEN 'materia_prima' THEN 'cmv_hamburguesas' WHEN 'descartables' THEN 'descartables_salon'
    WHEN 'limpieza' THEN 'limpieza_higiene' WHEN 'mantenimiento' THEN 'mantenimiento' WHEN 'marketing' THEN 'marketing' END,
  'consumo_inventario', cm.monto_consumido, cm.observaciones, 'consumos_manuales', cm.id, cm.created_by
FROM consumos_manuales cm WHERE cm.deleted_at IS NULL AND cm.categoria_pl IN ('materia_prima','descartables','limpieza','mantenimiento','marketing');

-- Audit
CREATE TRIGGER audit_rdo_mov AFTER INSERT OR UPDATE OR DELETE ON rdo_movimientos FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_inv AFTER INSERT OR UPDATE OR DELETE ON inversiones FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
