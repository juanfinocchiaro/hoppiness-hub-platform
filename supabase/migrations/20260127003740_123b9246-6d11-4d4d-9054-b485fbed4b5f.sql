-- =====================================================
-- TABLA: daily_sales
-- Sistema de carga manual de ventas por turno
-- =====================================================

CREATE TABLE IF NOT EXISTS public.daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Cuándo
  sale_date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night')),
  
  -- Montos por canal
  sales_counter DECIMAL(12,2) DEFAULT 0,      -- Mostrador
  sales_rappi DECIMAL(12,2) DEFAULT 0,        -- Rappi
  sales_pedidosya DECIMAL(12,2) DEFAULT 0,    -- PedidosYa
  sales_mp_delivery DECIMAL(12,2) DEFAULT 0,  -- MP Delivery
  sales_other DECIMAL(12,2) DEFAULT 0,        -- Otros
  
  -- Total (calculado automáticamente)
  sales_total DECIMAL(12,2) GENERATED ALWAYS AS (
    COALESCE(sales_counter, 0) + 
    COALESCE(sales_rappi, 0) + 
    COALESCE(sales_pedidosya, 0) + 
    COALESCE(sales_mp_delivery, 0) + 
    COALESCE(sales_other, 0)
  ) STORED,
  
  -- Notas
  notes TEXT,
  
  -- Auditoría
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  
  -- Evitar duplicados
  UNIQUE(branch_id, sale_date, shift)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_daily_sales_branch_date ON daily_sales(branch_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_created_by ON daily_sales(created_by);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_daily_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_sales_updated_at ON daily_sales;
CREATE TRIGGER trigger_daily_sales_updated_at
  BEFORE UPDATE ON daily_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_sales_updated_at();

-- RLS
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

-- Política: usuarios con acceso al local pueden ver las ventas
CREATE POLICY "Users with branch access can view daily_sales"
  ON daily_sales FOR SELECT
  USING (has_branch_access(auth.uid(), branch_id));

-- Política: usuarios con acceso al local pueden insertar ventas
CREATE POLICY "Users with branch access can insert daily_sales"
  ON daily_sales FOR INSERT
  WITH CHECK (has_branch_access(auth.uid(), branch_id));

-- Política: usuarios con acceso al local pueden actualizar sus propias cargas
CREATE POLICY "Users with branch access can update daily_sales"
  ON daily_sales FOR UPDATE
  USING (has_branch_access(auth.uid(), branch_id));