-- Create employee_schedules table for weekly work schedules
CREATE TABLE public.employee_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_day_off BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with branch access can view employee schedules"
ON public.employee_schedules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
        AND public.has_branch_access(auth.uid(), e.branch_id)
    )
);

CREATE POLICY "Users with staff permission can manage employee schedules"
ON public.employee_schedules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
        AND public.has_branch_permission(auth.uid(), e.branch_id, 'can_manage_staff')
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_employee_schedules_updated_at
BEFORE UPDATE ON public.employee_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_employee_schedules_employee ON public.employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_day ON public.employee_schedules(day_of_week);