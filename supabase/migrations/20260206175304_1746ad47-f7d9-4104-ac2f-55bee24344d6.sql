-- Drop and recreate meetings RLS policies to handle network meetings (branch_id = NULL)

-- Drop existing policies
DROP POLICY IF EXISTS meetings_insert ON meetings;
DROP POLICY IF EXISTS meetings_select ON meetings;
DROP POLICY IF EXISTS meetings_update ON meetings;
DROP POLICY IF EXISTS meetings_delete ON meetings;

-- Insert: HR can create for their branch, OR superadmin/coordinador for network meetings
CREATE POLICY "meetings_insert" ON meetings FOR INSERT TO authenticated
WITH CHECK (
  CASE 
    -- Network meetings (no branch): only superadmin or coordinador can create
    WHEN branch_id IS NULL THEN 
      is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'coordinador'
    -- Branch meetings: must be HR for that branch
    ELSE 
      is_hr_role(auth.uid(), branch_id)
  END
);

-- Select: Superadmin sees all, HR sees their branch meetings, participants see their meetings
CREATE POLICY "meetings_select" ON meetings FOR SELECT TO authenticated
USING (
  is_superadmin(auth.uid())
  OR get_brand_role(auth.uid()) IN ('coordinador', 'informes', 'contador_marca')
  OR (branch_id IS NOT NULL AND is_hr_role(auth.uid(), branch_id))
  OR EXISTS (
    SELECT 1 FROM meeting_participants mp 
    WHERE mp.meeting_id = meetings.id AND mp.user_id = auth.uid()
  )
);

-- Update: Creator or superadmin can update
CREATE POLICY "meetings_update" ON meetings FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() 
  OR is_superadmin(auth.uid())
)
WITH CHECK (
  created_by = auth.uid() 
  OR is_superadmin(auth.uid())
);

-- Delete: Creator or superadmin can delete
CREATE POLICY "meetings_delete" ON meetings FOR DELETE TO authenticated
USING (
  created_by = auth.uid() 
  OR is_superadmin(auth.uid())
);