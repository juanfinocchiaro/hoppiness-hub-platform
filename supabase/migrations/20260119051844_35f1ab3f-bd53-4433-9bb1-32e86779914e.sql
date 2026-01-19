-- Create employees table for operational staff (separate from auth.users)
CREATE TABLE public.employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    pin_code text NOT NULL,
    current_status text NOT NULL DEFAULT 'OFF_DUTY' CHECK (current_status IN ('WORKING', 'OFF_DUTY')),
    phone text,
    position text,
    hourly_rate numeric,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint for PIN per branch
CREATE UNIQUE INDEX employees_branch_pin_unique ON public.employees(branch_id, pin_code);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Staff can view employees in their branch
CREATE POLICY "Staff can view branch employees"
ON public.employees FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

-- Staff with permissions can manage employees
CREATE POLICY "Staff can manage branch employees"
ON public.employees FOR ALL
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- Create attendance_logs table linked to employees
CREATE TABLE public.attendance_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    log_type text NOT NULL CHECK (log_type IN ('IN', 'OUT')),
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    notes text
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view attendance logs in their branch
CREATE POLICY "Staff can view branch attendance logs"
ON public.attendance_logs FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

-- Anyone with branch access can create attendance logs (for clock in/out)
CREATE POLICY "Staff can create attendance logs"
ON public.attendance_logs FOR INSERT
WITH CHECK (has_branch_access(auth.uid(), branch_id));

-- Trigger to update employee status on clock in/out
CREATE OR REPLACE FUNCTION public.update_employee_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.employees
    SET current_status = CASE WHEN NEW.log_type = 'IN' THEN 'WORKING' ELSE 'OFF_DUTY' END,
        updated_at = now()
    WHERE id = NEW.employee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_attendance_log_insert
AFTER INSERT ON public.attendance_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_employee_status();

-- Add updated_at trigger for employees
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();