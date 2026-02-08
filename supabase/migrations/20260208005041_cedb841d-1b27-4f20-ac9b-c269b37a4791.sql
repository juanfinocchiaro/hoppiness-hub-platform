-- Remove the legacy unique CONSTRAINT that blocks saving multiple days of the same weekday per month
-- This constraint is incompatible with the current date-specific scheduling system (schedule_date)
-- The system now relies on idx_employee_schedules_user_date_unique (user_id, schedule_date) for uniqueness

ALTER TABLE public.employee_schedules 
DROP CONSTRAINT IF EXISTS employee_schedules_employee_month_day_shift_unique;