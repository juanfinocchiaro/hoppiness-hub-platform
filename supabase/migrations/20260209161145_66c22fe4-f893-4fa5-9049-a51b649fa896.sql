
-- =============================================
-- MIGRACIÓN 1: REDISEÑO DE COMPRAS
-- =============================================

-- 1. Drop tablas viejas (están vacías, confirmado)
DROP TABLE IF EXISTS pagos_proveedores CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TYPE IF EXISTS tipo_compra_enum CASCADE;

-- 2. Drop vista que referenciaba compras
DROP VIEW IF EXISTS cuenta_corriente_proveedores CASCADE;

-- =============================================
-- FACTURAS DE PROVEEDORES (reemplaza "compras")
-- =============================================

CREATE TABLE facturas_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  
  -- Datos de factura
  factura_tipo VARCHAR(1), -- 'A', 'B', 'C', NULL
  factura_numero VARCHAR(50) NOT NULL,
  factura_fecha DATE NOT NULL,
  factura_url TEXT,
  
  -- Totales
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva NUMERIC(12,2) DEFAULT 0,
  otros_impuestos NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Pago
  condicion_pago VARCHAR(20) DEFAULT 'contado',
  fecha_vencimiento DATE,
  estado_pago VARCHAR(20) DEFAULT 'pagado',
  saldo_pendiente NUMERIC(12,2) DEFAULT 0,
  
  -- Clasificación
  tipo VARCHAR(20) DEFAULT 'normal',
  motivo_extraordinaria TEXT,
  
  -- Período contable
  periodo VARCHAR(7) NOT NULL,
  
  observaciones TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_facturas_branch_periodo ON facturas_proveedores(branch_id, periodo) WHERE deleted_at IS NULL;
CREATE INDEX idx_facturas_proveedor ON facturas_proveedores(proveedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_facturas_fecha ON facturas_proveedores(factura_fecha DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_facturas_estado_pago ON facturas_proveedores(estado_pago) WHERE deleted_at IS NULL AND estado_pago != 'pagado';
CREATE INDEX idx_facturas_numero ON facturas_proveedores(factura_numero) WHERE deleted_at IS NULL;

ALTER TABLE facturas_proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facturas_select" ON facturas_proveedores FOR SELECT USING (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "facturas_insert" ON facturas_proveedores FOR INSERT WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "facturas_update" ON facturas_proveedores FOR UPDATE USING (is_financial_for_branch(auth.uid(), branch_id));

-- =============================================
-- ITEMS DE FACTURA
-- =============================================

CREATE TABLE items_factura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas_proveedores(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  
  cantidad NUMERIC(10,3) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  
  afecta_costo_base BOOLEAN DEFAULT TRUE,
  categoria_pl VARCHAR(50),
  
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_factura ON items_factura(factura_id);
CREATE INDEX idx_items_insumo ON items_factura(insumo_id);
CREATE INDEX idx_items_categoria_pl ON items_factura(categoria_pl) WHERE afecta_costo_base = TRUE;

ALTER TABLE items_factura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_factura_select" ON items_factura FOR SELECT USING (
  EXISTS (SELECT 1 FROM facturas_proveedores f WHERE f.id = items_factura.factura_id AND is_financial_for_branch(auth.uid(), f.branch_id))
);
CREATE POLICY "items_factura_insert" ON items_factura FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM facturas_proveedores f WHERE f.id = items_factura.factura_id AND is_financial_for_branch(auth.uid(), f.branch_id))
);
CREATE POLICY "items_factura_update" ON items_factura FOR UPDATE USING (
  EXISTS (SELECT 1 FROM facturas_proveedores f WHERE f.id = items_factura.factura_id AND is_financial_for_branch(auth.uid(), f.branch_id))
);
CREATE POLICY "items_factura_delete" ON items_factura FOR DELETE USING (
  EXISTS (SELECT 1 FROM facturas_proveedores f WHERE f.id = items_factura.factura_id AND is_financial_for_branch(auth.uid(), f.branch_id))
);

-- =============================================
-- DEVOLUCIONES
-- =============================================

CREATE TABLE devoluciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_original_id UUID NOT NULL REFERENCES facturas_proveedores(id),
  item_original_id UUID REFERENCES items_factura(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  
  fecha_devolucion DATE NOT NULL,
  motivo VARCHAR(200) NOT NULL,
  
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  cantidad_devuelta NUMERIC(10,3) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  total_devuelto NUMERIC(12,2) NOT NULL,
  
  nota_credito_numero VARCHAR(50),
  nota_credito_url TEXT,
  
  periodo VARCHAR(7) NOT NULL,
  observaciones TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_devoluciones_factura ON devoluciones(factura_original_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_devoluciones_branch_periodo ON devoluciones(branch_id, periodo) WHERE deleted_at IS NULL;

ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devoluciones_select" ON devoluciones FOR SELECT USING (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "devoluciones_insert" ON devoluciones FOR INSERT WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "devoluciones_update" ON devoluciones FOR UPDATE USING (is_financial_for_branch(auth.uid(), branch_id));

-- =============================================
-- PAGOS A PROVEEDORES (nueva)
-- =============================================

CREATE TABLE pagos_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  factura_id UUID NOT NULL REFERENCES facturas_proveedores(id),
  
  fecha_pago DATE NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  medio_pago VARCHAR(50) NOT NULL,
  referencia VARCHAR(100),
  datos_pago JSONB,
  observaciones TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pagos_factura ON pagos_proveedores(factura_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pagos_proveedor ON pagos_proveedores(proveedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pagos_branch ON pagos_proveedores(branch_id) WHERE deleted_at IS NULL;

ALTER TABLE pagos_proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagos_prov_select" ON pagos_proveedores FOR SELECT USING (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "pagos_prov_insert" ON pagos_proveedores FOR INSERT WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));

-- =============================================
-- TRIGGER: Actualizar total factura al cambiar items
-- =============================================

CREATE OR REPLACE FUNCTION actualizar_total_factura()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_subtotal NUMERIC(12,2);
  v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  
  SELECT COALESCE(SUM(subtotal), 0) INTO nuevo_subtotal
  FROM items_factura
  WHERE factura_id = v_factura_id;
  
  UPDATE facturas_proveedores
  SET 
    subtotal = nuevo_subtotal,
    total = nuevo_subtotal + COALESCE(iva, 0) + COALESCE(otros_impuestos, 0),
    updated_at = NOW()
  WHERE id = v_factura_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_total_after_item_change
AFTER INSERT OR UPDATE OR DELETE ON items_factura
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_factura();

-- =============================================
-- TRIGGER: Actualizar saldo factura al pagar
-- =============================================

CREATE OR REPLACE FUNCTION actualizar_saldo_factura()
RETURNS TRIGGER AS $$
DECLARE
  total_pagado NUMERIC(12,2);
  total_factura NUMERIC(12,2);
  v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  
  SELECT COALESCE(SUM(monto), 0) INTO total_pagado
  FROM pagos_proveedores
  WHERE factura_id = v_factura_id AND deleted_at IS NULL;
  
  SELECT total INTO total_factura
  FROM facturas_proveedores
  WHERE id = v_factura_id;
  
  UPDATE facturas_proveedores
  SET 
    saldo_pendiente = total_factura - total_pagado,
    estado_pago = CASE 
      WHEN total_factura - total_pagado <= 0 THEN 'pagado'
      ELSE 'pendiente'
    END,
    updated_at = NOW()
  WHERE id = v_factura_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_saldo_factura_after_pago
AFTER INSERT ON pagos_proveedores
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_factura();

CREATE TRIGGER update_saldo_factura_after_delete_pago
AFTER UPDATE OF deleted_at ON pagos_proveedores
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION actualizar_saldo_factura();

-- =============================================
-- AUDITORÍA
-- =============================================

CREATE TRIGGER audit_facturas 
  AFTER INSERT OR UPDATE OR DELETE ON facturas_proveedores
  FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

CREATE TRIGGER audit_items 
  AFTER INSERT OR UPDATE OR DELETE ON items_factura
  FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

CREATE TRIGGER audit_devoluciones 
  AFTER INSERT OR UPDATE OR DELETE ON devoluciones
  FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

CREATE TRIGGER audit_pagos_prov 
  AFTER INSERT OR UPDATE OR DELETE ON pagos_proveedores
  FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

-- =============================================
-- RECREAR VISTA cuenta_corriente_proveedores
-- =============================================

CREATE OR REPLACE VIEW cuenta_corriente_proveedores AS
SELECT 
  p.id as proveedor_id,
  p.razon_social,
  f.branch_id,
  b.name as branch_nombre,
  COUNT(f.id) as cantidad_facturas,
  SUM(f.total) as total_facturado,
  SUM(f.saldo_pendiente) as saldo_pendiente,
  SUM(f.total) - SUM(f.saldo_pendiente) as total_pagado,
  COUNT(*) FILTER (WHERE f.estado_pago = 'vencido') as facturas_vencidas,
  COUNT(*) FILTER (WHERE f.estado_pago = 'pendiente') as facturas_pendientes,
  MIN(f.fecha_vencimiento) FILTER (WHERE f.estado_pago IN ('pendiente', 'vencido')) as proximo_vencimiento,
  MAX(f.factura_fecha) as ultima_compra
FROM proveedores p
JOIN facturas_proveedores f ON f.proveedor_id = p.id AND f.deleted_at IS NULL
JOIN branches b ON b.id = f.branch_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.razon_social, f.branch_id, b.name;
