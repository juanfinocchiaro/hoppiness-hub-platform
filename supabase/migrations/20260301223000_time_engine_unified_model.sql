-- Unified time model (Option A) - additive migration
-- Includes configurable labor rules, leave taxonomy, vacation periods,
-- monthly closing entities, and schedule_requests extension for traceability.

-- 1) Labor config by branch
CREATE TABLE IF NOT EXISTS public.labor_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  convention_name TEXT,
  convention_description TEXT,
  daily_hours_limit NUMERIC(4,1) NOT NULL DEFAULT 9.0,
  monthly_hours_limit NUMERIC(5,1) NOT NULL DEFAULT 190.0,
  overtime_surcharge_weekday NUMERIC(5,1) NOT NULL DEFAULT 50.0,
  overtime_surcharge_holiday NUMERIC(5,1) NOT NULL DEFAULT 100.0,
  overtime_surcharge_day_off NUMERIC(5,1) NOT NULL DEFAULT 50.0,
  day_off_always_overtime BOOLEAN NOT NULL DEFAULT true,
  holiday_always_overtime BOOLEAN NOT NULL DEFAULT true,
  presentismo_enabled BOOLEAN NOT NULL DEFAULT true,
  presentismo_rule TEXT NOT NULL DEFAULT 'zero_unjustified',
  justification_window_days INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

-- Seed defaults for existing branches (non-destructive)
INSERT INTO public.labor_config (branch_id, convention_name, convention_description)
SELECT b.id, 'CCT 329/00 – Servicios Rápidos', 'Configuración base inicial'
FROM public.branches b
LEFT JOIN public.labor_config lc ON lc.branch_id = b.id
WHERE lc.id IS NULL;

ALTER TABLE public.labor_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS labor_config_select_hr ON public.labor_config;
CREATE POLICY labor_config_select_hr
ON public.labor_config
FOR SELECT
TO authenticated
USING (public.is_hr_role(auth.uid(), branch_id));

DROP POLICY IF EXISTS labor_config_all_hr ON public.labor_config;
CREATE POLICY labor_config_all_hr
ON public.labor_config
FOR ALL
TO authenticated
USING (public.is_hr_role(auth.uid(), branch_id))
WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- 2) Leave types per branch
CREATE TABLE IF NOT EXISTS public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  affects_presentismo BOOLEAN NOT NULL DEFAULT false,
  max_days_per_year INTEGER,
  requires_evidence BOOLEAN NOT NULL DEFAULT false,
  evidence_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, code)
);

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_types_select_hr ON public.leave_types;
CREATE POLICY leave_types_select_hr
ON public.leave_types
FOR SELECT
TO authenticated
USING (public.is_hr_role(auth.uid(), branch_id));

DROP POLICY IF EXISTS leave_types_all_hr ON public.leave_types;
CREATE POLICY leave_types_all_hr
ON public.leave_types
FOR ALL
TO authenticated
USING (public.is_hr_role(auth.uid(), branch_id))
WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- Seed default AR leave types for branches missing catalog
INSERT INTO public.leave_types (branch_id, code, label, is_paid, affects_presentismo, requires_evidence, evidence_description, sort_order)
SELECT b.id, t.code, t.label, t.is_paid, t.affects_presentismo, t.requires_evidence, t.evidence_description, t.sort_order
FROM public.branches b
CROSS JOIN (
  VALUES
    ('sick_leave', 'Enfermedad', true, false, true, 'Certificado médico', 10),
    ('work_accident', 'Accidente laboral', true, false, true, 'Constancia ART', 20),
    ('maternity', 'Maternidad', true, false, false, null, 30),
    ('paternity', 'Paternidad', true, false, false, null, 40),
    ('marriage', 'Matrimonio', true, false, true, 'Partida/acta', 50),
    ('bereavement_direct', 'Fallecimiento familiar directo', true, false, true, 'Constancia', 60),
    ('exam_study', 'Examen/Estudio', true, false, true, 'Constancia académica', 70),
    ('personal', 'Personal', false, false, false, null, 80),
    ('requested_day_off', 'Día libre solicitado', false, false, false, null, 90),
    ('other', 'Otro', false, false, false, null, 100)
) AS t(code, label, is_paid, affects_presentismo, requires_evidence, evidence_description, sort_order)
LEFT JOIN public.leave_types lt
  ON lt.branch_id = b.id AND lt.code = t.code
WHERE lt.id IS NULL;

-- 3) Vacation periods
CREATE TABLE IF NOT EXISTS public.vacation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  fiscal_year INTEGER NOT NULL,
  days_entitled INTEGER NOT NULL,
  days_already_taken INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacation_periods_branch_user_dates
ON public.vacation_periods(branch_id, user_id, start_date, end_date);

ALTER TABLE public.vacation_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vacation_periods_select ON public.vacation_periods;
CREATE POLICY vacation_periods_select
ON public.vacation_periods
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_hr_role(auth.uid(), branch_id)
);

DROP POLICY IF EXISTS vacation_periods_all_hr ON public.vacation_periods;
CREATE POLICY vacation_periods_all_hr
ON public.vacation_periods
FOR ALL
TO authenticated
USING (public.is_hr_role(auth.uid(), branch_id))
WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

-- 4) Extend schedule_requests for converted absences / leave details
ALTER TABLE public.schedule_requests
  ADD COLUMN IF NOT EXISTS leave_type_code TEXT,
  ADD COLUMN IF NOT EXISTS original_status TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS hours_granted NUMERIC(4,1);

CREATE INDEX IF NOT EXISTS idx_schedule_requests_leave_type_code
ON public.schedule_requests(branch_id, leave_type_code, request_date);

-- 5) Monthly closing entities
CREATE TABLE IF NOT EXISTS public.payroll_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  closed_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, month, year)
);

CREATE TABLE IF NOT EXISTS public.payroll_closing_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id UUID NOT NULL REFERENCES public.payroll_closings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_note TEXT,
  adjustments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(closing_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.payroll_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id UUID NOT NULL REFERENCES public.payroll_closings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2),
  payment_method TEXT NOT NULL DEFAULT 'transfer',
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(closing_id, user_id)
);

ALTER TABLE public.payroll_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_closing_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_closings_hr_all ON public.payroll_closings;
CREATE POLICY payroll_closings_hr_all
ON public.payroll_closings
FOR ALL
TO authenticated
USING (public.is_hr_role(auth.uid(), branch_id))
WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

DROP POLICY IF EXISTS payroll_closing_notes_select ON public.payroll_closing_notes;
CREATE POLICY payroll_closing_notes_select
ON public.payroll_closing_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payroll_closings pc
    WHERE pc.id = payroll_closing_notes.closing_id
      AND public.is_hr_role(auth.uid(), pc.branch_id)
  )
);

DROP POLICY IF EXISTS payroll_closing_notes_all ON public.payroll_closing_notes;
CREATE POLICY payroll_closing_notes_all
ON public.payroll_closing_notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payroll_closings pc
    WHERE pc.id = payroll_closing_notes.closing_id
      AND public.is_hr_role(auth.uid(), pc.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.payroll_closings pc
    WHERE pc.id = payroll_closing_notes.closing_id
      AND public.is_hr_role(auth.uid(), pc.branch_id)
  )
);

DROP POLICY IF EXISTS payroll_payments_select ON public.payroll_payments;
CREATE POLICY payroll_payments_select
ON public.payroll_payments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.payroll_closings pc
    WHERE pc.id = payroll_payments.closing_id
      AND public.is_hr_role(auth.uid(), pc.branch_id)
  )
);

DROP POLICY IF EXISTS payroll_payments_all ON public.payroll_payments;
CREATE POLICY payroll_payments_all
ON public.payroll_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payroll_closings pc
    WHERE pc.id = payroll_payments.closing_id
      AND public.is_hr_role(auth.uid(), pc.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.payroll_closings pc
    WHERE pc.id = payroll_payments.closing_id
      AND public.is_hr_role(auth.uid(), pc.branch_id)
  )
);

-- 6) Employee consumptions
CREATE TABLE IF NOT EXISTS public.employee_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  consumption_date DATE NOT NULL,
  registered_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_consumptions_branch_user_date
ON public.employee_consumptions(branch_id, user_id, consumption_date);

ALTER TABLE public.employee_consumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_consumptions_select ON public.employee_consumptions;
CREATE POLICY employee_consumptions_select
ON public.employee_consumptions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_hr_role(auth.uid(), branch_id)
);

DROP POLICY IF EXISTS employee_consumptions_all_hr ON public.employee_consumptions;
CREATE POLICY employee_consumptions_all_hr
ON public.employee_consumptions
FOR ALL
TO authenticated
USING (public.is_hr_role(auth.uid(), branch_id))
WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

