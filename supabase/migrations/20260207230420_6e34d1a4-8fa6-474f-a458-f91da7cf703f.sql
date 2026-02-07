-- Add evaluation fields for each present staff member
ALTER TABLE public.inspection_staff_present
ADD COLUMN uniform_ok BOOLEAN,
ADD COLUMN station_clean BOOLEAN;

-- Remove was_present column since we only add people who ARE present
ALTER TABLE public.inspection_staff_present
DROP COLUMN was_present;