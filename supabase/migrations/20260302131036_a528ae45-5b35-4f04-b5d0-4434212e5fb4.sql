
-- Phase 1: Create labor_config table
CREATE TABLE public.labor_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  monthly_hours_limit NUMERIC NOT NULL DEFAULT 190,
  daily_hours_limit NUMERIC NOT NULL DEFAULT 9,
  overtime_surcharge_pct NUMERIC NOT NULL DEFAULT 50,
  holiday_surcharge_pct NUMERIC NOT NULL DEFAULT 100,
  late_tolerance_total_min INTEGER NOT NULL DEFAULT 15,
  late_tolerance_per_entry_min INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

-- Enable RLS
ALTER TABLE public.labor_config ENABLE ROW LEVEL SECURITY;

-- Policies: read for authenticated users, write for admins (managed via app logic)
CREATE POLICY "Authenticated users can read labor_config"
  ON public.labor_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert labor_config"
  ON public.labor_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update labor_config"
  ON public.labor_config FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Insert global default row (branch_id = NULL)
INSERT INTO public.labor_config (branch_id) VALUES (NULL);

-- Phase 3b: Add early_leave_authorized to clock_entries
ALTER TABLE public.clock_entries ADD COLUMN early_leave_authorized BOOLEAN NOT NULL DEFAULT false;
