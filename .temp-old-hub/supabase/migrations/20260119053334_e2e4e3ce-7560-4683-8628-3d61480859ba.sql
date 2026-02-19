-- Add shift_number to support split shifts (turno cortado)
-- This allows multiple shifts per day for the same employee
ALTER TABLE public.employee_schedules 
DROP CONSTRAINT IF EXISTS employee_schedules_employee_id_day_of_week_key;

-- Add shift_number column
ALTER TABLE public.employee_schedules 
ADD COLUMN IF NOT EXISTS shift_number INTEGER NOT NULL DEFAULT 1;

-- Create new unique constraint including shift_number
ALTER TABLE public.employee_schedules 
ADD CONSTRAINT employee_schedules_employee_day_shift_unique 
UNIQUE(employee_id, day_of_week, shift_number);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_employee_schedules_shift ON public.employee_schedules(shift_number);