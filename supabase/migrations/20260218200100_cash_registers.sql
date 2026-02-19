-- =============================================
-- Fase 2: Caja - cash_registers, shifts, movements
-- Permite múltiples cajas por sucursal y movimientos detallados
-- =============================================

-- Cajas (una o más por branch)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_branch ON cash_registers(branch_id);

-- Turnos de caja (apertura/cierre por caja)
CREATE TABLE IF NOT EXISTS public.cash_register_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_cash_register_shifts_register ON cash_register_shifts(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_shifts_branch_status ON cash_register_shifts(branch_id, status);

-- Movimientos de caja (ingresos, egresos, retiros, depósitos)
CREATE TABLE IF NOT EXISTS public.cash_register_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES cash_register_shifts(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'withdrawal', 'deposit')),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  amount DECIMAL(10,2) NOT NULL,
  concept VARCHAR(255) NOT NULL,
  order_id UUID REFERENCES pedidos(id),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_register_movements_shift ON cash_register_movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_branch ON cash_register_movements(branch_id);

-- RLS
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage cash_registers" ON cash_registers;
CREATE POLICY "Staff can manage cash_registers" ON cash_registers FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage cash_register_shifts" ON cash_register_shifts;
CREATE POLICY "Staff can manage cash_register_shifts" ON cash_register_shifts FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage cash_register_movements" ON cash_register_movements;
CREATE POLICY "Staff can manage cash_register_movements" ON cash_register_movements FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

-- Una caja por defecto por branch que aún no tenga
INSERT INTO public.cash_registers (branch_id, name, display_order, is_active)
  SELECT b.id, 'Caja 1', 0, TRUE
  FROM branches b
  WHERE NOT EXISTS (SELECT 1 FROM cash_registers r WHERE r.branch_id = b.id);
