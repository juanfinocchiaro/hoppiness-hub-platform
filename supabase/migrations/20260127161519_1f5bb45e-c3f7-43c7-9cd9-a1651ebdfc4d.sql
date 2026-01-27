
-- =====================================================
-- SISTEMA DE CARGA DE VENTAS E INGREDIENTES - NÚCLEO CHECK
-- =====================================================

-- 1. Agregar kitchen_type a branches (smash o parrilla)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS kitchen_type TEXT DEFAULT 'smash' CHECK (kitchen_type IN ('smash', 'parrilla'));

-- 2. Agregar campos faltantes a ingredients para el cálculo
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS nucleo_code TEXT UNIQUE; -- Código para mapeo con Núcleo Check
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS weight_grams INTEGER; -- Peso en gramos (para carnes)

-- 3. Crear tabla de importaciones de ventas (cabecera)
CREATE TABLE IF NOT EXISTS sales_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Rango de fechas del archivo
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  
  file_name TEXT,
  records_count INTEGER DEFAULT 0,
  
  -- Totales de ventas
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  -- Por canal (según Tipo de pedido del Excel)
  sales_salon DECIMAL(12,2) DEFAULT 0,
  sales_mostrador DECIMAL(12,2) DEFAULT 0,
  sales_delivery DECIMAL(12,2) DEFAULT 0,
  
  -- Consumo calculado
  consumed_panes INTEGER DEFAULT 0,
  consumed_bolitas_90 INTEGER DEFAULT 0,
  consumed_bolitas_45 INTEGER DEFAULT 0,
  consumed_medallones_110 INTEGER DEFAULT 0,
  consumed_papas INTEGER DEFAULT 0,
  consumed_carne_kg DECIMAL(10,2) DEFAULT 0,
  
  -- Productos no reconocidos
  unknown_products JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  imported_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique per branch and date range
  UNIQUE(branch_id, date_from, date_to)
);

-- 4. Crear tabla de detalle de ventas importadas
CREATE TABLE IF NOT EXISTS sales_import_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES sales_imports(id) ON DELETE CASCADE,
  
  -- Datos del Excel
  fecha TIMESTAMPTZ,
  n_pedido TEXT,
  codigo TEXT,
  nombre TEXT,
  cantidad DECIMAL(10,2),
  total DECIMAL(12,2),
  rubro TEXT,
  subrubro TEXT,
  tipo_pedido TEXT, -- 'Salón', 'Mostrador', 'Delivery'
  sector TEXT,
  
  -- Consumo calculado para esta línea
  calc_panes INTEGER DEFAULT 0,
  calc_bolitas_90 INTEGER DEFAULT 0,
  calc_bolitas_45 INTEGER DEFAULT 0,
  calc_medallones_110 INTEGER DEFAULT 0,
  calc_papas INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_import_details_import ON sales_import_details(import_id);
CREATE INDEX IF NOT EXISTS idx_sales_import_details_codigo ON sales_import_details(codigo);

-- 5. Crear tabla para mapeo de códigos Núcleo Check → Recetas
-- Esta tabla simplifica el mapeo sin modificar product_recipes
CREATE TABLE IF NOT EXISTS nucleo_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  nucleo_code TEXT NOT NULL UNIQUE, -- Código del producto en Núcleo Check
  product_name TEXT NOT NULL, -- Nombre para referencia
  product_type TEXT DEFAULT 'burger' CHECK (product_type IN ('burger', 'combo', 'extra', 'side', 'drink', 'other')),
  
  -- Ingredientes para cocina SMASH (bolitas)
  smash_panes INTEGER DEFAULT 0,
  smash_bolitas_90 INTEGER DEFAULT 0,
  smash_bolitas_45 INTEGER DEFAULT 0,
  smash_papas INTEGER DEFAULT 0,
  
  -- Ingredientes para cocina PARRILLA (medallones)
  parrilla_panes INTEGER DEFAULT 0,
  parrilla_medallones_110 INTEGER DEFAULT 0,
  parrilla_papas INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_nucleo_product_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_nucleo_product_mappings_updated_at ON nucleo_product_mappings;
CREATE TRIGGER tr_nucleo_product_mappings_updated_at
  BEFORE UPDATE ON nucleo_product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_nucleo_product_mappings_updated_at();

-- 7. Enable RLS
ALTER TABLE sales_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_import_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE nucleo_product_mappings ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- sales_imports: Ver y crear si tiene acceso a la sucursal
CREATE POLICY "Users can view sales imports for their branches"
  ON sales_imports FOR SELECT
  USING (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Users can insert sales imports for their branches"
  ON sales_imports FOR INSERT
  WITH CHECK (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Users can delete sales imports for their branches"
  ON sales_imports FOR DELETE
  USING (has_branch_access_v2(auth.uid(), branch_id));

-- sales_import_details: Heredan permisos de la cabecera
CREATE POLICY "Users can view sales import details"
  ON sales_import_details FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sales_imports si 
    WHERE si.id = import_id 
    AND has_branch_access_v2(auth.uid(), si.branch_id)
  ));

CREATE POLICY "Users can insert sales import details"
  ON sales_import_details FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales_imports si 
    WHERE si.id = import_id 
    AND has_branch_access_v2(auth.uid(), si.branch_id)
  ));

-- nucleo_product_mappings: Solo admins pueden modificar, todos pueden ver
CREATE POLICY "Anyone can view product mappings"
  ON nucleo_product_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage product mappings"
  ON nucleo_product_mappings FOR ALL
  USING (is_admin(auth.uid()));

-- 9. Actualizar Villa Allende a cocina parrilla
UPDATE branches SET kitchen_type = 'parrilla' WHERE name ILIKE '%villa allende%';

-- 10. Insertar mapeos de productos iniciales (todas las recetas del documento)
INSERT INTO nucleo_product_mappings (nucleo_code, product_name, product_type, smash_panes, smash_bolitas_90, smash_bolitas_45, smash_papas, parrilla_panes, parrilla_medallones_110, parrilla_papas) VALUES
-- HAMBURGUESAS SIMPLES (1 medallón)
('H027', 'Victoria Burger', 'burger', 1, 1, 0, 1, 1, 1, 1),
('H008', 'Cheese Burger', 'burger', 1, 1, 0, 1, 1, 1, 1),
('H004', 'Bacon Burger', 'burger', 1, 1, 0, 1, 1, 1, 1),
('AM01', 'American Burger', 'burger', 1, 1, 0, 1, 1, 1, 1),
('H029', 'Royal Burger', 'burger', 1, 1, 0, 1, 1, 1, 1),
('ON01', 'Fried Onion', 'burger', 1, 1, 0, 1, 1, 1, 1),
('ON01.', 'Fried Onion (alt)', 'burger', 1, 1, 0, 1, 1, 1, 1),
-- HAMBURGUESAS DOBLES (2 medallones)
('H007', 'Carolina Burger', 'burger', 1, 2, 0, 1, 1, 2, 1),
('H011', 'Avocado Burger', 'burger', 1, 2, 0, 1, 1, 2, 1),
('H023', 'Django Burger', 'burger', 1, 2, 0, 1, 1, 2, 1),
('H024', 'Seta Burger', 'burger', 1, 2, 0, 1, 1, 2, 1),
('H002', 'Argenta Burger', 'burger', 1, 2, 0, 1, 1, 2, 1),
('H001', 'Wesley Burger', 'burger', 1, 2, 0, 1, 1, 2, 1),
('H025', 'Cheesenator Burger', 'burger', 1, 2, 0, 1, 1, 2, 1),
-- HAMBURGUESAS TRIPLES (3 medallones)
('H031', 'Baconator Burger', 'burger', 1, 3, 0, 1, 1, 3, 1),
('BIG01', 'Big Hopp', 'burger', 1, 3, 0, 1, 1, 3, 1),
-- VEGGIE/VEGAN (sin carne)
('H020', 'Not American / Vegan', 'burger', 1, 0, 0, 1, 1, 0, 1),
('H013', 'Not Chicken / Veggie', 'burger', 1, 0, 0, 1, 1, 0, 1),
('029', 'Not American', 'burger', 1, 0, 0, 1, 1, 0, 1),
('030', 'Not Chicken', 'burger', 1, 0, 0, 1, 1, 0, 1),
-- COMBOS ULTRA (4 bolitas 45g) - Solo SMASH
('PRO-006', 'Combo Ultra Cheese', 'combo', 1, 0, 4, 1, 0, 0, 0),
('PRO-007', 'Combo Ultra Bacon', 'combo', 1, 0, 4, 1, 0, 0, 0),
('SMA-001', 'Ultra Cheese Burger', 'combo', 1, 0, 4, 1, 0, 0, 0),
('SMA-002', 'Ultra Bacon Burger', 'combo', 1, 0, 4, 1, 0, 0, 0),
-- PROMOS (son dobles)
('PROM1', 'Promo Argenta', 'burger', 1, 2, 0, 1, 1, 2, 1),
('PROM2', 'Promo Doble Cheese', 'burger', 1, 2, 0, 1, 1, 2, 1),
('PROM3', 'Promo Doble Royal', 'burger', 1, 2, 0, 1, 1, 2, 1),
('PROM4', 'Promo Doble American', 'burger', 1, 2, 0, 1, 1, 2, 1),
-- COMBO ROYAL x2 (2 hamburguesas simples)
('H030', 'Combo Royal x2', 'combo', 2, 2, 0, 2, 2, 2, 2),
-- EXTRAS DE CARNE
('CAR1', 'Extra Carne con queso', 'extra', 0, 1, 0, 0, 0, 1, 0),
('CAR2', 'Extra Carne con queso y bacon', 'extra', 0, 1, 0, 0, 0, 1, 0),
('CAR3', 'Extra Carne x2', 'extra', 0, 2, 0, 0, 0, 2, 0),
('CAR4', 'Extra Carne x3', 'extra', 0, 3, 0, 0, 0, 3, 0),
('CAR6', 'Extra Carne + Bacon x2', 'extra', 0, 2, 0, 0, 0, 2, 0),
-- PAPAS EXTRAS
('P05', 'Papas extra / Bolsita delivery', 'side', 0, 0, 0, 1, 0, 0, 1),
('29', 'Papas clásicas', 'side', 0, 0, 0, 1, 0, 0, 1),
('P01', 'Bandeja de papas salón', 'side', 0, 0, 0, 3, 0, 0, 3)
ON CONFLICT (nucleo_code) DO NOTHING;
