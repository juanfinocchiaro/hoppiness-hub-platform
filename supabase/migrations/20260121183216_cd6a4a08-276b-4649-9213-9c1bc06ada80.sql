
-- =====================================================
-- FASE 1: MIGRACIONES PARA SISTEMA DE CAJA MEJORADO
-- =====================================================

-- 1.1 Tabla salary_advances (Adelantos de Sueldo)
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'pending_transfer', 'transferred', 'deducted', 'cancelled')),
  
  authorized_by UUID,
  authorized_at TIMESTAMPTZ,
  
  paid_by UUID,
  paid_at TIMESTAMPTZ,
  shift_id UUID REFERENCES cash_register_shifts(id) ON DELETE SET NULL,
  
  transferred_by UUID,
  transferred_at TIMESTAMPTZ,
  transfer_reference TEXT,
  
  deducted_in_payroll_id UUID,
  deducted_at TIMESTAMPTZ,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_salary_advances_branch ON salary_advances(branch_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_employee ON salary_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_status ON salary_advances(status);
CREATE INDEX IF NOT EXISTS idx_salary_advances_shift ON salary_advances(shift_id);

ALTER TABLE salary_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branch access for advances" ON salary_advances;
CREATE POLICY "Branch access for advances" ON salary_advances
  FOR ALL USING (has_branch_access(auth.uid(), branch_id));

-- 1.2 Tabla cashier_discrepancy_history (Historial de Diferencias)
CREATE TABLE IF NOT EXISTS public.cashier_discrepancy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES cash_register_shifts(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cash_register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL,
  
  expected_amount NUMERIC(10,2) NOT NULL,
  actual_amount NUMERIC(10,2) NOT NULL,
  discrepancy NUMERIC(10,2) NOT NULL,
  
  shift_date DATE NOT NULL,
  notes TEXT,
  
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(shift_id)
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_user ON cashier_discrepancy_history(user_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_branch ON cashier_discrepancy_history(branch_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_date ON cashier_discrepancy_history(shift_date);

ALTER TABLE cashier_discrepancy_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branch access for discrepancies" ON cashier_discrepancy_history;
CREATE POLICY "Branch access for discrepancies" ON cashier_discrepancy_history
  FOR ALL USING (has_branch_access(auth.uid(), branch_id));

-- 1.3 Tabla operator_session_logs (Log de Operadores)
CREATE TABLE IF NOT EXISTS public.operator_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  previous_user_id UUID,
  current_user_id UUID NOT NULL,
  
  action_type TEXT NOT NULL CHECK (action_type IN ('confirm_identity', 'operator_change', 'session_start', 'auto_logout')),
  triggered_by TEXT,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_logs_branch ON operator_session_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_user ON operator_session_logs(current_user_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_date ON operator_session_logs(created_at);

ALTER TABLE operator_session_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branch access for operator logs" ON operator_session_logs;
CREATE POLICY "Branch access for operator logs" ON operator_session_logs
  FOR ALL USING (has_branch_access(auth.uid(), branch_id));

-- 1.4 Modificaciones a tablas existentes
ALTER TABLE cash_register_movements
ADD COLUMN IF NOT EXISTS salary_advance_id UUID REFERENCES salary_advances(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operated_by UUID,
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS authorized_by UUID;

CREATE INDEX IF NOT EXISTS idx_movements_advance ON cash_register_movements(salary_advance_id);
CREATE INDEX IF NOT EXISTS idx_movements_operated_by ON cash_register_movements(operated_by);

ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS expense_pin_threshold NUMERIC(10,2) DEFAULT 50000;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS transfer_status TEXT CHECK (transfer_status IN ('pending', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS transfer_executed_by UUID,
ADD COLUMN IF NOT EXISTS transfer_executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_reference TEXT;

-- 1.5 Trigger para registrar diferencias automáticamente
CREATE OR REPLACE FUNCTION record_shift_discrepancy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
    INSERT INTO cashier_discrepancy_history (
      shift_id, branch_id, user_id, cash_register_id,
      expected_amount, actual_amount, discrepancy,
      shift_date, notes
    ) VALUES (
      NEW.id, NEW.branch_id,
      COALESCE(NEW.closed_by, NEW.opened_by),
      NEW.cash_register_id,
      COALESCE(NEW.expected_amount, 0),
      COALESCE(NEW.closing_amount, 0),
      COALESCE(NEW.closing_amount, 0) - COALESCE(NEW.expected_amount, 0),
      CURRENT_DATE,
      NEW.notes
    )
    ON CONFLICT (shift_id) DO UPDATE SET
      actual_amount = EXCLUDED.actual_amount,
      discrepancy = EXCLUDED.discrepancy,
      notes = EXCLUDED.notes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_shift_discrepancy ON cash_register_shifts;
CREATE TRIGGER trg_record_shift_discrepancy
  AFTER UPDATE ON cash_register_shifts
  FOR EACH ROW
  EXECUTE FUNCTION record_shift_discrepancy();

-- 1.6 Función para validar PIN de supervisor
CREATE OR REPLACE FUNCTION validate_supervisor_pin(
  _branch_id UUID,
  _pin TEXT
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash TEXT;
BEGIN
  v_pin_hash := encode(digest(_pin, 'sha256'), 'hex');
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    ur.role::TEXT
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE p.pin_hash = v_pin_hash
    AND ur.is_active = true
    AND ur.role IN ('encargado', 'franquiciado', 'admin')
    AND (ur.branch_id = _branch_id OR ur.branch_id IS NULL)
  LIMIT 1;
END;
$$;

-- 1.7 Función para obtener estadísticas de diferencias
CREATE OR REPLACE FUNCTION get_cashier_discrepancy_stats(
  _user_id UUID,
  _branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_shifts BIGINT,
  perfect_shifts BIGINT,
  precision_pct NUMERIC,
  discrepancy_this_month NUMERIC,
  discrepancy_total NUMERIC,
  last_discrepancy_date DATE,
  last_discrepancy_amount NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE cdh.discrepancy = 0) as perfect,
      SUM(cdh.discrepancy) FILTER (
        WHERE DATE_TRUNC('month', cdh.shift_date) = DATE_TRUNC('month', CURRENT_DATE)
      ) as month_disc,
      SUM(cdh.discrepancy) as total_disc,
      MAX(cdh.shift_date) as last_date
    FROM cashier_discrepancy_history cdh
    WHERE cdh.user_id = _user_id
      AND (_branch_id IS NULL OR cdh.branch_id = _branch_id)
  ),
  last_entry AS (
    SELECT cdh.discrepancy
    FROM cashier_discrepancy_history cdh
    WHERE cdh.user_id = _user_id
      AND (_branch_id IS NULL OR cdh.branch_id = _branch_id)
    ORDER BY cdh.shift_date DESC
    LIMIT 1
  )
  SELECT
    s.total,
    s.perfect,
    ROUND((s.perfect::NUMERIC / NULLIF(s.total, 0)) * 100, 1),
    COALESCE(s.month_disc, 0),
    COALESCE(s.total_disc, 0),
    s.last_date,
    COALESCE(l.discrepancy, 0)
  FROM stats s
  LEFT JOIN last_entry l ON true;
END;
$$;

-- 1.8 Función para obtener adelantos de un turno
CREATE OR REPLACE FUNCTION get_shift_advances(_shift_id UUID)
RETURNS TABLE (
  id UUID,
  employee_name TEXT,
  amount NUMERIC,
  authorized_by_name TEXT,
  paid_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sa.id,
    e.full_name as employee_name,
    sa.amount,
    p.full_name as authorized_by_name,
    sa.paid_at
  FROM salary_advances sa
  JOIN employees e ON e.id = sa.employee_id
  LEFT JOIN profiles p ON p.user_id = sa.authorized_by
  WHERE sa.shift_id = _shift_id
    AND sa.status = 'paid'
  ORDER BY sa.paid_at;
$$;

-- 1.9 Función para obtener gastos de un turno
CREATE OR REPLACE FUNCTION get_shift_expenses(_shift_id UUID)
RETURNS TABLE (
  id UUID,
  concept TEXT,
  amount NUMERIC,
  category_name TEXT,
  recorded_by_name TEXT,
  authorized_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    crm.id,
    crm.concept,
    crm.amount,
    tc.name as category_name,
    p1.full_name as recorded_by_name,
    p2.full_name as authorized_by_name,
    crm.created_at
  FROM cash_register_movements crm
  LEFT JOIN transactions t ON t.id = crm.transaction_id
  LEFT JOIN transaction_categories tc ON tc.id = t.category_id
  LEFT JOIN profiles p1 ON p1.user_id = crm.operated_by
  LEFT JOIN profiles p2 ON p2.user_id = crm.authorized_by
  WHERE crm.shift_id = _shift_id
    AND crm.type = 'egreso'
    AND crm.salary_advance_id IS NULL
  ORDER BY crm.created_at;
$$;

-- 1.10 Permisos
INSERT INTO permission_definitions (key, name, description, module, min_role) VALUES
('cash.pay_advances', 'Pagar adelantos', 'Pagar adelantos autorizados en efectivo', 'cash', 'cajero'),
('cash.authorize_advances', 'Autorizar adelantos', 'Autorizar adelantos sin PIN', 'cash', 'encargado'),
('cash.quick_expenses', 'Registrar gastos', 'Registrar gastos desde caja', 'cash', 'cajero'),
('cash.authorize_expenses', 'Autorizar gastos', 'Autorizar gastos sin PIN', 'cash', 'encargado'),
('cash.manual_income', 'Ingreso manual', 'Registrar ingresos manuales', 'cash', 'cajero'),
('cash.view_discrepancies', 'Ver diferencias', 'Ver reporte de diferencias', 'reports', 'encargado'),
('finance.pending_transfers', 'Ver transferencias pendientes', 'Ver y ejecutar transferencias', 'finance', 'encargado'),
('hr.manage_advances', 'Gestionar adelantos', 'CRUD completo de adelantos', 'hr', 'franquiciado')
ON CONFLICT (key) DO NOTHING;
