
-- =====================================================
-- MODELO CONTABLE INTERNO - COA + LEDGER UNIFICADO
-- =====================================================

-- 1) TABLA COA (Plan de Cuentas 3 niveles)
CREATE TABLE public.coa_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  level integer NOT NULL CHECK (level IN (1, 2, 3)), -- 1=group, 2=rubro, 3=detalle
  parent_id uuid REFERENCES public.coa_accounts(id),
  account_type text NOT NULL CHECK (account_type IN ('income', 'expense', 'asset', 'liability', 'equity')),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Índices para COA
CREATE INDEX idx_coa_accounts_parent ON public.coa_accounts(parent_id);
CREATE INDEX idx_coa_accounts_level ON public.coa_accounts(level);
CREATE UNIQUE INDEX idx_coa_accounts_code ON public.coa_accounts(code);

-- RLS para COA
ALTER TABLE public.coa_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view COA accounts"
  ON public.coa_accounts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage COA"
  ON public.coa_accounts FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 2) EXTENDER TABLA TRANSACTIONS
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS accrual_date date,
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'partial', 'cancelled')),
  ADD COLUMN IF NOT EXISTS doc_status text DEFAULT 'internal' CHECK (doc_status IN ('documented', 'undocumented', 'internal')),
  ADD COLUMN IF NOT EXISTS attachment_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coa_account_id uuid REFERENCES public.coa_accounts(id);

-- Migrar transaction_date a accrual_date donde está null
UPDATE public.transactions SET accrual_date = transaction_date WHERE accrual_date IS NULL;

-- Migrar receipt_type a doc_status
UPDATE public.transactions 
SET doc_status = CASE 
  WHEN receipt_type::text = 'OFFICIAL' THEN 'documented'
  WHEN receipt_type::text = 'INTERNAL' THEN 'internal'
  ELSE 'internal'
END
WHERE doc_status = 'internal';

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_transactions_accrual ON public.transactions(accrual_date);
CREATE INDEX IF NOT EXISTS idx_transactions_payment ON public.transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_coa ON public.transactions(coa_account_id);

-- 3) EXTENDER TABLA SUPPLIERS
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS default_doc_status text DEFAULT 'internal' CHECK (default_doc_status IN ('documented', 'undocumented', 'internal')),
  ADD COLUMN IF NOT EXISTS default_payment_origin text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cuit text,
  ADD COLUMN IF NOT EXISTS bank_account text;

-- 4) TABLA TAX_OBLIGATIONS (Impuestos devengados)
CREATE TABLE public.tax_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  name text NOT NULL,
  tax_type text NOT NULL, -- IIBB, IVA, Ganancias, Monotributo, etc.
  period text NOT NULL, -- YYYY-MM
  accrual_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  amount_paid numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'in_plan')),
  coa_account_id uuid REFERENCES public.coa_accounts(id),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tax_obligations_branch ON public.tax_obligations(branch_id);
CREATE INDEX idx_tax_obligations_status ON public.tax_obligations(status);
CREATE INDEX idx_tax_obligations_due ON public.tax_obligations(due_date);

ALTER TABLE public.tax_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch tax obligations"
  ON public.tax_obligations FOR SELECT
  USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Managers can manage tax obligations"
  ON public.tax_obligations FOR ALL
  USING (has_branch_permission(auth.uid(), branch_id, 'can_view_reports'))
  WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_view_reports'));

-- 5) TABLA PAYMENT_PLANS (Planes de pago para impuestos vencidos)
CREATE TABLE public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  tax_obligation_id uuid REFERENCES public.tax_obligations(id),
  description text NOT NULL,
  total_amount numeric NOT NULL,
  down_payment numeric DEFAULT 0,
  num_installments integer NOT NULL,
  interest_rate numeric DEFAULT 0,
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_plans_branch ON public.payment_plans(branch_id);
CREATE INDEX idx_payment_plans_status ON public.payment_plans(status);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch payment plans"
  ON public.payment_plans FOR SELECT
  USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Managers can manage payment plans"
  ON public.payment_plans FOR ALL
  USING (has_branch_permission(auth.uid(), branch_id, 'can_view_reports'))
  WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_view_reports'));

-- 6) TABLA PAYMENT_PLAN_INSTALLMENTS (Cuotas de planes)
CREATE TABLE public.payment_plan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount_capital numeric NOT NULL,
  amount_interest numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  transaction_id uuid REFERENCES public.transactions(id),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_plan_installments_plan ON public.payment_plan_installments(plan_id);
CREATE INDEX idx_plan_installments_status ON public.payment_plan_installments(status);
CREATE INDEX idx_plan_installments_due ON public.payment_plan_installments(due_date);

ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view installments via plan"
  ON public.payment_plan_installments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payment_plans pp
    WHERE pp.id = payment_plan_installments.plan_id
    AND has_branch_access(auth.uid(), pp.branch_id)
  ));

CREATE POLICY "Managers can manage installments"
  ON public.payment_plan_installments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.payment_plans pp
    WHERE pp.id = payment_plan_installments.plan_id
    AND has_branch_permission(auth.uid(), pp.branch_id, 'can_view_reports')
  ));

-- 7) TABLA LOANS (Préstamos)
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  lender_name text NOT NULL,
  description text,
  principal_amount numeric NOT NULL,
  interest_rate numeric DEFAULT 0,
  num_installments integer NOT NULL,
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
  income_transaction_id uuid REFERENCES public.transactions(id), -- Alta como ingreso tipo Deuda
  coa_account_id uuid REFERENCES public.coa_accounts(id),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_loans_branch ON public.loans(branch_id);
CREATE INDEX idx_loans_status ON public.loans(status);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch loans"
  ON public.loans FOR SELECT
  USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Managers can manage loans"
  ON public.loans FOR ALL
  USING (has_branch_permission(auth.uid(), branch_id, 'can_view_reports'))
  WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_view_reports'));

-- 8) TABLA LOAN_INSTALLMENTS (Cuotas de préstamos)
CREATE TABLE public.loan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount_capital numeric NOT NULL,
  amount_interest numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  transaction_id uuid REFERENCES public.transactions(id),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_loan_installments_loan ON public.loan_installments(loan_id);
CREATE INDEX idx_loan_installments_status ON public.loan_installments(status);
CREATE INDEX idx_loan_installments_due ON public.loan_installments(due_date);

ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view loan installments via loan"
  ON public.loan_installments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.loans l
    WHERE l.id = loan_installments.loan_id
    AND has_branch_access(auth.uid(), l.branch_id)
  ));

CREATE POLICY "Managers can manage loan installments"
  ON public.loan_installments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.loans l
    WHERE l.id = loan_installments.loan_id
    AND has_branch_permission(auth.uid(), l.branch_id, 'can_view_reports')
  ));

-- 9) TABLA FINANCE_ACCOUNTS (Cuentas: Caja, Banco, MP, etc.)
CREATE TABLE public.finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('cash', 'bank', 'digital', 'card', 'echeq')),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_finance_accounts_branch_code ON public.finance_accounts(branch_id, code);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch finance accounts"
  ON public.finance_accounts FOR SELECT
  USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Managers can manage finance accounts"
  ON public.finance_accounts FOR ALL
  USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
  WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- Trigger para crear cuentas por defecto al crear sucursal
CREATE OR REPLACE FUNCTION public.setup_default_finance_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.finance_accounts (branch_id, code, name, account_type, display_order)
  VALUES
    (NEW.id, 'EFECTIVO', 'Caja Efectivo', 'cash', 1),
    (NEW.id, 'BANCO', 'Cuenta Bancaria', 'bank', 2),
    (NEW.id, 'MP', 'MercadoPago', 'digital', 3),
    (NEW.id, 'TARJETA', 'Tarjetas', 'card', 4),
    (NEW.id, 'ECHEQ', 'eCheqs', 'echeq', 5);
  RETURN NEW;
END;
$$;

CREATE TRIGGER setup_finance_accounts_on_branch
AFTER INSERT ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.setup_default_finance_accounts();
