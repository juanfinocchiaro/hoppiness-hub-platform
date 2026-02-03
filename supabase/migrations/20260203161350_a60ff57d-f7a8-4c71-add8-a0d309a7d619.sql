-- Add columns for absence justification system
ALTER TABLE schedule_requests 
ADD COLUMN IF NOT EXISTS evidence_url TEXT NULL,
ADD COLUMN IF NOT EXISTS absence_type TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN schedule_requests.evidence_url IS 'URL of evidence file (medical certificate, etc.)';
COMMENT ON COLUMN schedule_requests.absence_type IS 'Type of absence: medical, personal, emergency, other';