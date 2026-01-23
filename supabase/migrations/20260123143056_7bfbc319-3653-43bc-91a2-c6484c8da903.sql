-- =====================================================
-- REFACTORIZACIÓN SISTEMA DE PROVEEDORES Y COMPRAS
-- =====================================================

-- 1. Categorías de productos obligatorios de marca
CREATE TABLE brand_mandatory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Productos obligatorios con su proveedor
CREATE TABLE brand_mandatory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES brand_mandatory_categories(id) ON DELETE CASCADE,
  
  -- El ingrediente del sistema (puede ser NULL si es nuevo)
  ingredient_id UUID REFERENCES ingredients(id),
  product_name TEXT NOT NULL,
  
  -- Proveedor principal (obligatorio)
  primary_supplier_id UUID NOT NULL REFERENCES suppliers(id),
  
  -- Presentación
  unit_name TEXT NOT NULL DEFAULT 'unidad',
  units_per_package INT NOT NULL DEFAULT 1,
  purchase_multiple INT DEFAULT 1,
  suggested_price DECIMAL(12,2),
  
  -- Backup (opcional)
  backup_supplier_id UUID REFERENCES suppliers(id),
  backup_product_name TEXT,
  backup_units_per_package INT,
  backup_allowed_condition TEXT DEFAULT 'never' CHECK (backup_allowed_condition IN ('never', 'stock_emergency', 'always')),
  alert_brand_on_backup BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Alertas de compras a la marca
CREATE TABLE brand_purchase_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('backup_used', 'unauthorized_supplier', 'wrong_supplier')),
  mandatory_product_id UUID REFERENCES brand_mandatory_products(id),
  supplier_used_id UUID REFERENCES suppliers(id),
  details JSONB,
  seen_by UUID,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_mandatory_products_ingredient ON brand_mandatory_products(ingredient_id);
CREATE INDEX idx_mandatory_products_supplier ON brand_mandatory_products(primary_supplier_id);
CREATE INDEX idx_mandatory_products_category ON brand_mandatory_products(category_id);
CREATE INDEX idx_purchase_alerts_branch ON brand_purchase_alerts(branch_id);
CREATE INDEX idx_purchase_alerts_unseen ON brand_purchase_alerts(seen_at) WHERE seen_at IS NULL;

-- RLS
ALTER TABLE brand_mandatory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_mandatory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_purchase_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para categorías
CREATE POLICY "categories_read_all" ON brand_mandatory_categories FOR SELECT USING (true);
CREATE POLICY "categories_manage_superadmin" ON brand_mandatory_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles_v2 WHERE user_id = auth.uid() AND brand_role = 'superadmin' AND is_active = true)
);

-- Políticas para productos obligatorios
CREATE POLICY "products_read_all" ON brand_mandatory_products FOR SELECT USING (true);
CREATE POLICY "products_manage_superadmin" ON brand_mandatory_products FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles_v2 WHERE user_id = auth.uid() AND brand_role = 'superadmin' AND is_active = true)
);

-- Políticas para alertas
CREATE POLICY "alerts_read_brand" ON brand_purchase_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles_v2 WHERE user_id = auth.uid() AND brand_role IS NOT NULL AND is_active = true)
  OR branch_id IN (SELECT unnest(branch_ids) FROM user_roles_v2 WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "alerts_insert_authenticated" ON brand_purchase_alerts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "alerts_update_brand" ON brand_purchase_alerts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles_v2 WHERE user_id = auth.uid() AND brand_role IN ('superadmin', 'coordinador') AND is_active = true)
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_brand_mandatory_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_brand_mandatory_products_updated_at
  BEFORE UPDATE ON brand_mandatory_products
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_mandatory_products_updated_at();

-- =====================================================
-- SEED DATA INICIAL - Categorías
-- =====================================================
INSERT INTO brand_mandatory_categories (name, description, sort_order) VALUES
('Carnes', 'Carnes y proteínas de la marca', 1),
('Panes', 'Panes para hamburguesas', 2),
('Salsas y Condimentos', 'Salsas de marca y condimentos', 3),
('Descartables Marca', 'Packaging con branding Hoppiness', 4);