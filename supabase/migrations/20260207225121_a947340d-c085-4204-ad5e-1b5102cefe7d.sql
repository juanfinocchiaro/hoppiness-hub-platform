-- Soporte para turno cortado (split shift)
ALTER TABLE employee_schedules 
  ADD COLUMN IF NOT EXISTS start_time_2 TIME,
  ADD COLUMN IF NOT EXISTS end_time_2 TIME;