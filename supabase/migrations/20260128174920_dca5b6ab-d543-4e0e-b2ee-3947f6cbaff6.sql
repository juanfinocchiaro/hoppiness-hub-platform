-- Add GPS tracking columns to clock_entries
ALTER TABLE public.clock_entries 
ADD COLUMN IF NOT EXISTS gps_status text,
ADD COLUMN IF NOT EXISTS gps_message text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;