-- Add column for tracking previous action plan review
ALTER TABLE coachings 
ADD COLUMN IF NOT EXISTS previous_action_review TEXT;

COMMENT ON COLUMN coachings.previous_action_review IS 
'Revision del cumplimiento del plan de accion del mes anterior';