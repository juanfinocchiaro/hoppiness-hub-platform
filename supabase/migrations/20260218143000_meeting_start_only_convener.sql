-- Ensure only the convener can start a meeting.
-- Applies to transition: convocada -> en_curso.

CREATE OR REPLACE FUNCTION public.enforce_meeting_start_by_convener()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF
    OLD.status = 'convocada'
    AND NEW.status = 'en_curso'
    AND auth.uid() IS NOT NULL
    AND NEW.created_by IS DISTINCT FROM auth.uid()
  THEN
    RAISE EXCEPTION 'Solo quien convocó la reunión puede iniciarla'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_meeting_start_by_convener ON public.meetings;

CREATE TRIGGER trg_enforce_meeting_start_by_convener
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_meeting_start_by_convener();
