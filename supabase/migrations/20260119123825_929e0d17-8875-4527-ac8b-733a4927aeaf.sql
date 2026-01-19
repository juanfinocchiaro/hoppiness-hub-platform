-- Part 1: Create separate table for sensitive employee data
CREATE TABLE public.employee_private_details (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id uuid NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    dni text,
    cuit text,
    cbu text,
    address text,
    birth_date date,
    emergency_contact text,
    emergency_phone text,
    hourly_rate numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.employee_private_details ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user can manage staff in the employee's branch
CREATE OR REPLACE FUNCTION public.can_view_employee_private_details(_employee_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = _employee_id
        AND (
            public.is_admin(_user_id) OR
            public.has_branch_permission(_user_id, e.branch_id, 'can_manage_staff')
        )
    )
$$;

-- RLS Policy: Only admins and users with can_manage_staff permission can view private details
CREATE POLICY "Only managers can view employee private details"
ON public.employee_private_details FOR SELECT
USING (public.can_view_employee_private_details(employee_id, auth.uid()));

-- RLS Policy: Only admins and users with can_manage_staff permission can insert private details
CREATE POLICY "Only managers can insert employee private details"
ON public.employee_private_details FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_private_details.employee_id
        AND (
            public.is_admin(auth.uid()) OR
            public.has_branch_permission(auth.uid(), e.branch_id, 'can_manage_staff')
        )
    )
);

-- RLS Policy: Only admins and users with can_manage_staff permission can update private details
CREATE POLICY "Only managers can update employee private details"
ON public.employee_private_details FOR UPDATE
USING (public.can_view_employee_private_details(employee_id, auth.uid()))
WITH CHECK (public.can_view_employee_private_details(employee_id, auth.uid()));

-- RLS Policy: Only admins and users with can_manage_staff permission can delete private details
CREATE POLICY "Only managers can delete employee private details"
ON public.employee_private_details FOR DELETE
USING (public.can_view_employee_private_details(employee_id, auth.uid()));

-- Migrate existing sensitive data from employees to employee_private_details
INSERT INTO public.employee_private_details (employee_id, dni, cuit, cbu, address, birth_date, emergency_contact, emergency_phone, hourly_rate)
SELECT id, dni, cuit, cbu, address, birth_date, emergency_contact, emergency_phone, hourly_rate
FROM public.employees
WHERE dni IS NOT NULL OR cuit IS NOT NULL OR cbu IS NOT NULL OR address IS NOT NULL OR birth_date IS NOT NULL OR emergency_contact IS NOT NULL OR emergency_phone IS NOT NULL OR hourly_rate IS NOT NULL;

-- Part 2: Update employees table RLS - restrict to managers only for basic viewing
DROP POLICY IF EXISTS "Staff can view branch employees" ON public.employees;

-- New policy: Managers (with can_manage_staff) can view full employee info
CREATE POLICY "Managers can view branch employees"
ON public.employees FOR SELECT
USING (public.has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- New policy: Basic staff can only see names (for attendance/scheduling display)
-- We'll create a view for this instead

-- Part 3: Create a public-safe view for basic employee info (name only)
CREATE OR REPLACE VIEW public.employees_basic
WITH (security_invoker = on) AS
SELECT 
    id,
    branch_id,
    full_name,
    position,
    photo_url,
    current_status,
    is_active
FROM public.employees;

-- Part 4: Secure the profiles table - create a public view without sensitive data
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- More restrictive: users can only see their own profile OR if they are admin
CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Create a safe view for colleague visibility (only name and avatar)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
    id,
    user_id,
    full_name,
    avatar_url,
    is_active
FROM public.profiles;

-- Trigger to auto-update updated_at on employee_private_details
CREATE TRIGGER update_employee_private_details_updated_at
BEFORE UPDATE ON public.employee_private_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();