-- Fix infinite recursion between meetings <-> meeting_participants RLS

-- 1) Helper function to check participation without invoking RLS policies
CREATE OR REPLACE FUNCTION public.is_meeting_participant(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meeting_participants mp
    WHERE mp.meeting_id = _meeting_id
      AND mp.user_id = _user_id
  );
$$;

-- 2) Replace meetings_select policy to use the helper function (avoid querying meeting_participants directly)
DROP POLICY IF EXISTS meetings_select ON public.meetings;

CREATE POLICY "meetings_select" ON public.meetings
FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR get_brand_role(auth.uid()) IN ('coordinador', 'informes', 'contador_marca')
  OR (branch_id IS NOT NULL AND is_hr_role(auth.uid(), branch_id))
  OR public.is_meeting_participant(auth.uid(), id)
);
