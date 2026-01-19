-- Add month/year columns to employee_schedules for monthly scheduling
ALTER TABLE public.employee_schedules 
ADD COLUMN IF NOT EXISTS schedule_month integer,
ADD COLUMN IF NOT EXISTS schedule_year integer;

-- Update the unique constraint to include month/year
ALTER TABLE public.employee_schedules 
DROP CONSTRAINT IF EXISTS employee_schedules_employee_day_shift_unique;

ALTER TABLE public.employee_schedules 
ADD CONSTRAINT employee_schedules_employee_month_day_shift_unique 
UNIQUE (employee_id, schedule_year, schedule_month, day_of_week, shift_number);

-- Create index for efficient monthly queries
CREATE INDEX IF NOT EXISTS idx_employee_schedules_month_year 
ON public.employee_schedules (employee_id, schedule_year, schedule_month);

-- Set default values for existing records (current month)
UPDATE public.employee_schedules 
SET schedule_month = EXTRACT(MONTH FROM CURRENT_DATE)::integer,
    schedule_year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
WHERE schedule_month IS NULL;