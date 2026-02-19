-- =============================================
-- Fase 3: Cierre mensual de stock
-- Tabla stock_cierre_mensual para registrar stock físico por período y mermas
-- =============================================

CREATE TABLE public.stock_cierre_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  periodo DATE NOT NULL,

  stock_apertura DECIMAL(10,3) NOT NULL DEFAULT 0,
  compras DECIMAL(10,3) NOT NULL DEFAULT 0,
  consumo_ventas DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_esperado DECIMAL(10,3) NOT NULL DEFAULT 0,

  stock_cierre_fisico DECIMAL(10,3) NOT NULL,
  merma DECIMAL(10,3) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(branch_id, insumo_id, periodo)
);

CREATE INDEX idx_stock_cierre_branch_periodo ON stock_cierre_mensual(branch_id, periodo);
CREATE INDEX idx_stock_cierre_insumo ON stock_cierre_mensual(insumo_id);

COMMENT ON TABLE public.stock_cierre_mensual IS 'Cierre mensual de stock por insumo: apertura, compras, ventas, esperado, físico y merma';

ALTER TABLE stock_cierre_mensual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage stock_cierre_mensual" ON stock_cierre_mensual FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
