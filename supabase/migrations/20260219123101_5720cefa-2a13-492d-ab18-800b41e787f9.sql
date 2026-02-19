
-- 1. Add register_type to cash_registers
ALTER TABLE public.cash_registers ADD COLUMN IF NOT EXISTS register_type TEXT DEFAULT 'ventas';

-- 2. Add source_register_id to cash_register_movements for transfer traceability
ALTER TABLE public.cash_register_movements ADD COLUMN IF NOT EXISTS source_register_id UUID REFERENCES public.cash_registers(id);

-- 3. Update existing registers to type 'ventas' and rename
UPDATE public.cash_registers SET register_type = 'ventas', name = 'Caja de Ventas' WHERE register_type IS NULL OR register_type = 'ventas';

-- 4. Create Caja de Alivio and Caja Fuerte for each branch that has a ventas register
INSERT INTO public.cash_registers (branch_id, name, display_order, is_active, register_type)
SELECT DISTINCT cr.branch_id, 'Caja de Alivio', 2, true, 'alivio'
FROM public.cash_registers cr
WHERE cr.register_type = 'ventas'
AND NOT EXISTS (
  SELECT 1 FROM public.cash_registers cr2 
  WHERE cr2.branch_id = cr.branch_id AND cr2.register_type = 'alivio'
);

INSERT INTO public.cash_registers (branch_id, name, display_order, is_active, register_type)
SELECT DISTINCT cr.branch_id, 'Caja Fuerte', 3, true, 'fuerte'
FROM public.cash_registers cr
WHERE cr.register_type = 'ventas'
AND NOT EXISTS (
  SELECT 1 FROM public.cash_registers cr2 
  WHERE cr2.branch_id = cr.branch_id AND cr2.register_type = 'fuerte'
);

-- 5. Create perpetual shifts for alivio and fuerte registers (they don't close)
INSERT INTO public.cash_register_shifts (cash_register_id, branch_id, opened_by, opening_amount, status)
SELECT cr.id, cr.branch_id, (SELECT id FROM auth.users LIMIT 1), 0, 'open'
FROM public.cash_registers cr
WHERE cr.register_type IN ('alivio', 'fuerte')
AND NOT EXISTS (
  SELECT 1 FROM public.cash_register_shifts crs 
  WHERE crs.cash_register_id = cr.id AND crs.status = 'open'
);
