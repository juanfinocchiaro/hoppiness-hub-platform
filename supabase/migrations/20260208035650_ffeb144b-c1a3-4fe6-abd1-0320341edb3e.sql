-- Drop the partial unique index that PostgreSQL can't use for ON CONFLICT
DROP INDEX IF EXISTS idx_employee_schedules_user_date_unique;

-- Create a proper UNIQUE index (non-partial) for ON CONFLICT support
CREATE UNIQUE INDEX idx_employee_schedules_user_date_upsert 
ON public.employee_schedules (user_id, schedule_date);

-- Add a comment explaining why this index exists
COMMENT ON INDEX idx_employee_schedules_user_date_upsert IS 
'Non-partial unique index required for PostgreSQL upsert ON CONFLICT clause. Partial indexes with WHERE clauses cannot be used for conflict resolution.';