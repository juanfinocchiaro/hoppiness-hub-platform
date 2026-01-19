-- Create cash_registers table for multiple registers per branch
CREATE TABLE public.cash_registers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create cash_register_shifts table for tracking shifts
CREATE TABLE public.cash_register_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  closed_by uuid,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  difference numeric,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- Create cash_register_movements table for tracking money movements
CREATE TABLE public.cash_register_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id uuid NOT NULL REFERENCES public.cash_register_shifts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'withdrawal', 'deposit')),
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  concept text NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payment_methods table for customizable payment methods
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  is_cash boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(branch_id, code)
);

-- Enable RLS on all tables
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS for cash_registers
CREATE POLICY "Staff can view branch cash registers"
ON public.cash_registers FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff with permission can manage cash registers"
ON public.cash_registers FOR ALL
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- RLS for cash_register_shifts
CREATE POLICY "Staff can view branch shifts"
ON public.cash_register_shifts FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can create shifts"
ON public.cash_register_shifts FOR INSERT
WITH CHECK (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can update shifts"
ON public.cash_register_shifts FOR UPDATE
USING (has_branch_access(auth.uid(), branch_id))
WITH CHECK (has_branch_access(auth.uid(), branch_id));

-- RLS for cash_register_movements
CREATE POLICY "Staff can view branch movements"
ON public.cash_register_movements FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can create movements"
ON public.cash_register_movements FOR INSERT
WITH CHECK (has_branch_access(auth.uid(), branch_id));

-- RLS for payment_methods
CREATE POLICY "Staff can view branch payment methods"
ON public.payment_methods FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff with permission can manage payment methods"
ON public.payment_methods FOR ALL
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- Insert default cash registers for existing branches (3 per branch)
INSERT INTO public.cash_registers (branch_id, name, display_order)
SELECT b.id, 'Caja 1', 1 FROM public.branches b
UNION ALL
SELECT b.id, 'Caja 2', 2 FROM public.branches b
UNION ALL
SELECT b.id, 'Caja 3', 3 FROM public.branches b;

-- Insert default payment methods for existing branches
INSERT INTO public.payment_methods (branch_id, name, code, is_cash, display_order)
SELECT b.id, 'Efectivo', 'efectivo', true, 1 FROM public.branches b
UNION ALL
SELECT b.id, 'Tarjeta Débito', 'tarjeta_debito', false, 2 FROM public.branches b
UNION ALL
SELECT b.id, 'Tarjeta Crédito', 'tarjeta_credito', false, 3 FROM public.branches b
UNION ALL
SELECT b.id, 'MercadoPago QR', 'mercadopago_qr', false, 4 FROM public.branches b
UNION ALL
SELECT b.id, 'Transferencia', 'transferencia', false, 5 FROM public.branches b;