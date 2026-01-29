-- Step 1: Enhance employee_schedules for monthly schedule system
-- The current structure uses day_of_week which is for weekly patterns
-- We need to support specific dates for monthly scheduling

-- First, add branch_id for access control (derived from user's branch assignment)
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Add schedule_date for specific day scheduling (replaces day_of_week pattern)
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS schedule_date DATE;

-- Add tracking columns for publication and modifications
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS modification_reason TEXT,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- Create index for efficient queries by user and month/year
CREATE INDEX IF NOT EXISTS idx_employee_schedules_user_month 
ON public.employee_schedules(user_id, schedule_year, schedule_month);

-- Create index for branch-based queries
CREATE INDEX IF NOT EXISTS idx_employee_schedules_branch_date 
ON public.employee_schedules(branch_id, schedule_date);

-- Create unique constraint to prevent duplicate entries for same user/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_schedules_user_date_unique 
ON public.employee_schedules(user_id, schedule_date) 
WHERE schedule_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.employee_schedules.branch_id IS 'Branch this schedule belongs to (for RLS)';
COMMENT ON COLUMN public.employee_schedules.schedule_date IS 'Specific date for this schedule entry (for monthly scheduling)';
COMMENT ON COLUMN public.employee_schedules.published_at IS 'Timestamp when the schedule was first published to the employee';
COMMENT ON COLUMN public.employee_schedules.published_by IS 'User who published the schedule';
COMMENT ON COLUMN public.employee_schedules.modified_at IS 'Timestamp of the last modification after publication';
COMMENT ON COLUMN public.employee_schedules.modified_by IS 'User who made the last modification';
COMMENT ON COLUMN public.employee_schedules.modification_reason IS 'Optional reason for modification';
COMMENT ON COLUMN public.employee_schedules.notification_sent_at IS 'Timestamp when the employee was notified of this schedule or change';