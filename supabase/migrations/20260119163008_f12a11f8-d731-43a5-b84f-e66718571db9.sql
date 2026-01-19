-- ============================================
-- FASE 1: LEDGER UNIFICADO - MIGRACIÓN GRADUAL
-- ============================================

-- 1. Extender tabla transactions con campos faltantes para ledger completo
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS direction text CHECK (direction IN ('income', 'expense', 'transfer')) DEFAULT 'expense',
ADD COLUMN IF NOT EXISTS category_group text CHECK (category_group IN ('Ingresos', 'CMV', 'Gastos Operativos', 'RRHH', 'Estructura', 'Impuestos', 'Transferencias')),
ADD COLUMN IF NOT EXISTS account_id text DEFAULT 'Efectivo',
ADD COLUMN IF NOT EXISTS receipt_type text CHECK (receipt_type IN ('internal', 'fiscal')) DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS caja_id uuid REFERENCES cash_registers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS turno_id uuid REFERENCES cash_register_shifts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD COLUMN IF NOT EXISTS updated_by uuid,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- 2. Agregar transaction_id a cash_register_movements para vincular
ALTER TABLE cash_register_movements
ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

-- 3. Agregar transaction_id a supplier_payments para vincular
ALTER TABLE supplier_payments
ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

-- 4. Crear tabla de availability_log para tracking de cambios de disponibilidad
CREATE TABLE IF NOT EXISTS availability_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('product', 'modifier')),
  item_id uuid NOT NULL,
  new_state boolean NOT NULL,
  reason text CHECK (reason IN ('sin_stock', 'rotura', 'falta_insumo', 'decision_comercial', 'otro')),
  until_date timestamptz,
  notes text,
  changed_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 5. Crear tabla de order_cancellations para auditoría de cancelaciones
CREATE TABLE IF NOT EXISTS order_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  cancelled_by uuid,
  cancelled_at timestamptz DEFAULT now(),
  cancel_reason text CHECK (cancel_reason IN ('cliente_no_responde', 'cliente_cancela', 'sin_stock', 'error_pedido', 'demora_excesiva', 'problema_pago', 'otro')),
  cancel_notes text,
  refund_amount numeric DEFAULT 0,
  refund_method text
);

-- 6. Extender branches con sistema de override Admin/Local
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS local_open_state boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_force_state text CHECK (admin_force_state IN ('none', 'force_open', 'force_closed', 'disabled')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS local_channels jsonb DEFAULT '{"delivery": true, "takeaway": true, "dine_in": true}',
ADD COLUMN IF NOT EXISTS admin_force_channels jsonb;

-- 7. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_branch_date ON transactions(branch_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_turno ON transactions(turno_id) WHERE turno_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_supplier ON transactions(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_availability_logs_branch ON availability_logs(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_order ON order_cancellations(order_id);

-- 8. Función para calcular effective_state
CREATE OR REPLACE FUNCTION get_branch_effective_state(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_force text;
  v_local_state boolean;
BEGIN
  SELECT admin_force_state, local_open_state 
  INTO v_admin_force, v_local_state
  FROM branches 
  WHERE id = p_branch_id;
  
  -- Prioridad: disabled > force_closed > force_open > local_state
  IF v_admin_force = 'disabled' THEN
    RETURN 'disabled';
  ELSIF v_admin_force = 'force_closed' THEN
    RETURN 'closed_by_admin';
  ELSIF v_admin_force = 'force_open' THEN
    RETURN 'open_by_admin';
  ELSIF v_local_state THEN
    RETURN 'open';
  ELSE
    RETURN 'closed';
  END IF;
END;
$$;

-- 9. Trigger para auto-actualizar updated_at en transactions
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- 10. RLS para availability_logs
ALTER TABLE availability_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch availability logs"
ON availability_logs FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can create availability logs"
ON availability_logs FOR INSERT
WITH CHECK (has_branch_access(auth.uid(), branch_id));

-- 11. RLS para order_cancellations
ALTER TABLE order_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view order cancellations"
ON order_cancellations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.id = order_cancellations.order_id 
  AND has_branch_access(auth.uid(), o.branch_id)
));

CREATE POLICY "Staff can create order cancellations"
ON order_cancellations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.id = order_cancellations.order_id 
  AND has_branch_permission(auth.uid(), o.branch_id, 'can_manage_orders')
));