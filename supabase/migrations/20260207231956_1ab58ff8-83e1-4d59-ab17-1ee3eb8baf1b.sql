-- Add break time columns for shift breaks
ALTER TABLE employee_schedules 
  ADD COLUMN IF NOT EXISTS break_start TIME,
  ADD COLUMN IF NOT EXISTS break_end TIME;

COMMENT ON COLUMN employee_schedules.break_start IS 'Break start time for shifts over 6 hours';
COMMENT ON COLUMN employee_schedules.break_end IS 'Break end time for shifts over 6 hours';