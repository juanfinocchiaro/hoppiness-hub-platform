-- Drop unused columns from branches table
-- These fields were identified as not being used in the codebase

ALTER TABLE branches DROP COLUMN IF EXISTS allowed_ips;
ALTER TABLE branches DROP COLUMN IF EXISTS local_channels;
ALTER TABLE branches DROP COLUMN IF EXISTS status_message;

-- Drop the tables table since it's not used (no restaurant uses mesas)
DROP TABLE IF EXISTS public.tables;