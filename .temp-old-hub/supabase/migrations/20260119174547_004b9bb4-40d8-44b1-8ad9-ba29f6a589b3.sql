-- =============================================
-- PAYROLL SYSTEM TABLES
-- =============================================

-- 1) Períodos de liquidación por sucursal
CREATE TABLE public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- formato 'YYYY-MM'
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  tip_pool_amount NUMERIC(12,2) DEFAULT 0,
  tip_distribution_method TEXT DEFAULT 'equal' CHECK (tip_distribution_method IN ('equal', 'hours_weighted')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, month)
);

-- 2) Entrada por empleado por período (Blanco/Negro + propinas checkbox)
CREATE TABLE public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount_white NUMERIC(12,2) DEFAULT 0, -- Blanco (fiscal)
  amount_black NUMERIC(12,2) DEFAULT 0, -- Negro (interno)
  include_in_tips BOOLEAN DEFAULT true, -- LA BOCHA - checkbox propinas
  notes TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_id, employee_id)
);

-- 3) Ajustes: adelantos, consumos, extras, propinas
CREATE TABLE public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('advance', 'consumption', 'extra', 'tip')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'derived')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  ledger_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL
);

-- 4) Pagos parciales al empleado
CREATE TABLE public.payroll_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT DEFAULT 'cash' CHECK (method IN ('cash', 'transfer', 'mp', 'other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  ledger_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL
);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

-- PAYROLL_PERIODS: Staff con acceso a sucursal puede ver, solo franquiciado/admin puede crear/editar/cerrar
CREATE POLICY "Staff can view payroll periods"
  ON public.payroll_periods FOR SELECT
  USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Managers can manage payroll periods"
  ON public.payroll_periods FOR ALL
  USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
  WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- PAYROLL_ENTRIES: Solo franquiciado/admin puede ver/editar Blanco/Negro
CREATE POLICY "Staff can view payroll entries"
  ON public.payroll_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_entries.period_id
    AND has_branch_access(auth.uid(), pp.branch_id)
  ));

CREATE POLICY "Managers can manage payroll entries"
  ON public.payroll_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_entries.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_entries.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ));

-- PAYROLL_ADJUSTMENTS: Encargados pueden cargar adelantos/consumos/extras, todos ven
CREATE POLICY "Staff can view payroll adjustments"
  ON public.payroll_adjustments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_adjustments.period_id
    AND has_branch_access(auth.uid(), pp.branch_id)
  ));

CREATE POLICY "Staff can create payroll adjustments"
  ON public.payroll_adjustments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_adjustments.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ));

CREATE POLICY "Managers can update/delete payroll adjustments"
  ON public.payroll_adjustments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_adjustments.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ));

CREATE POLICY "Managers can delete payroll adjustments"
  ON public.payroll_adjustments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_adjustments.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ));

-- PAYROLL_PAYMENTS: Similar a adjustments
CREATE POLICY "Staff can view payroll payments"
  ON public.payroll_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_payments.period_id
    AND has_branch_access(auth.uid(), pp.branch_id)
  ));

CREATE POLICY "Staff can create payroll payments"
  ON public.payroll_payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_payments.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ));

CREATE POLICY "Managers can update payroll payments"
  ON public.payroll_payments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_payments.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ));

CREATE POLICY "Managers can delete payroll payments"
  ON public.payroll_payments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.payroll_periods pp
    WHERE pp.id = payroll_payments.period_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_manage_staff')
  ));

-- Índices para performance
CREATE INDEX idx_payroll_periods_branch_month ON public.payroll_periods(branch_id, month);
CREATE INDEX idx_payroll_entries_period ON public.payroll_entries(period_id);
CREATE INDEX idx_payroll_entries_employee ON public.payroll_entries(employee_id);
CREATE INDEX idx_payroll_adjustments_period ON public.payroll_adjustments(period_id);
CREATE INDEX idx_payroll_adjustments_employee ON public.payroll_adjustments(employee_id);
CREATE INDEX idx_payroll_payments_period ON public.payroll_payments(period_id);
CREATE INDEX idx_payroll_payments_employee ON public.payroll_payments(employee_id);