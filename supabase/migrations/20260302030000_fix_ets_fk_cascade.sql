-- FIX: employee_time_state FK blocks clock_entries deletion
-- Change foreign keys to ON DELETE SET NULL so deleting a clock entry
-- doesn't fail when it's referenced as the last event.

ALTER TABLE employee_time_state
  DROP CONSTRAINT IF EXISTS employee_time_state_last_event_id_fkey;

ALTER TABLE employee_time_state
  ADD CONSTRAINT employee_time_state_last_event_id_fkey
  FOREIGN KEY (last_event_id) REFERENCES clock_entries(id)
  ON DELETE SET NULL;

ALTER TABLE employee_time_state
  DROP CONSTRAINT IF EXISTS employee_time_state_open_clock_in_id_fkey;

ALTER TABLE employee_time_state
  ADD CONSTRAINT employee_time_state_open_clock_in_id_fkey
  FOREIGN KEY (open_clock_in_id) REFERENCES clock_entries(id)
  ON DELETE SET NULL;
