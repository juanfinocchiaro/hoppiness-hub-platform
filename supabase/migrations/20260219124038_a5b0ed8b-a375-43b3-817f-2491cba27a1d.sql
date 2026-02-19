
-- Parte 1: Agregar campos contables a cash_register_movements
ALTER TABLE public.cash_register_movements 
  ADD COLUMN IF NOT EXISTS categoria_gasto TEXT,
  ADD COLUMN IF NOT EXISTS rdo_category_code TEXT,
  ADD COLUMN IF NOT EXISTS estado_aprobacion TEXT DEFAULT 'aprobado',
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Parte 2: Trigger de sincronización cash_register_movements → gastos
CREATE OR REPLACE FUNCTION public.sync_expense_movement_to_gastos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_periodo TEXT;
  v_branch_id UUID;
BEGIN
  -- Only sync expense movements
  IF NEW.type != 'expense' THEN
    RETURN NEW;
  END IF;

  -- Skip if not approved
  IF COALESCE(NEW.estado_aprobacion, 'aprobado') = 'rechazado' THEN
    RETURN NEW;
  END IF;

  v_branch_id := NEW.branch_id;
  v_periodo := to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM');

  -- Upsert into gastos table (which has its own trigger sync_gasto_to_rdo)
  INSERT INTO public.gastos (
    id,
    branch_id,
    periodo,
    categoria_principal,
    concepto,
    monto,
    fecha,
    medio_pago,
    observaciones,
    estado,
    created_by,
    rdo_category_code
  ) VALUES (
    NEW.id,  -- use same ID for traceability
    v_branch_id,
    v_periodo,
    COALESCE(NEW.categoria_gasto, 'caja_chica'),
    NEW.concept,
    NEW.amount,
    (COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Argentina/Cordoba')::date,
    NEW.payment_method,
    NEW.observaciones,
    CASE 
      WHEN COALESCE(NEW.estado_aprobacion, 'aprobado') = 'pendiente_aprobacion' THEN 'pendiente'
      ELSE 'pagado'
    END,
    NEW.recorded_by,
    NEW.rdo_category_code
  )
  ON CONFLICT (id) DO UPDATE SET
    categoria_principal = COALESCE(EXCLUDED.categoria_principal, gastos.categoria_principal),
    concepto = EXCLUDED.concepto,
    monto = EXCLUDED.monto,
    medio_pago = EXCLUDED.medio_pago,
    observaciones = EXCLUDED.observaciones,
    estado = EXCLUDED.estado,
    rdo_category_code = EXCLUDED.rdo_category_code,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_sync_expense_to_gastos ON public.cash_register_movements;
CREATE TRIGGER trg_sync_expense_to_gastos
  AFTER INSERT OR UPDATE ON public.cash_register_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_movement_to_gastos();
