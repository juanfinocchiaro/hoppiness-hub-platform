-- Fix RLS policies for meeting_participants to support network meetings (branch_id = NULL)

-- DROP existing policies
DROP POLICY IF EXISTS "meeting_participants_insert" ON public.meeting_participants;
DROP POLICY IF EXISTS "meeting_participants_select" ON public.meeting_participants;
DROP POLICY IF EXISTS "meeting_participants_update" ON public.meeting_participants;

-- INSERT: Allow for branch meetings (HR role) OR network meetings (creator/superadmin/coordinador)
CREATE POLICY "meeting_participants_insert" ON public.meeting_participants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_participants.meeting_id
    AND (
      -- Branch meetings: HR of the branch
      (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR
      -- Network meetings: creator, superadmin or coordinador
      (m.branch_id IS NULL AND (
        m.created_by = auth.uid() 
        OR is_superadmin(auth.uid()) 
        OR get_brand_role(auth.uid()) = 'coordinador'
      ))
    )
  )
);

-- SELECT: User sees own participation, superadmins see all, HR sees branch meetings, brand roles see network
CREATE POLICY "meeting_participants_select" ON public.meeting_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_participants.meeting_id
    AND (
      (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR 
      (m.branch_id IS NULL AND (
        m.created_by = auth.uid() 
        OR get_brand_role(auth.uid()) IN ('coordinador', 'informes', 'contador_marca')
      ))
    )
  )
);

-- UPDATE: User can update own, superadmins can update all, HR can update branch, creators can update network
CREATE POLICY "meeting_participants_update" ON public.meeting_participants
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_participants.meeting_id
    AND (
      (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR 
      (m.branch_id IS NULL AND m.created_by = auth.uid())
    )
  )
);