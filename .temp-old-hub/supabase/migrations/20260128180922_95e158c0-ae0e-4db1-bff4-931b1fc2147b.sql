-- Phase 5: Enhanced Communications System

-- Add tag field for predefined categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'tag') THEN
    ALTER TABLE public.communications ADD COLUMN tag TEXT DEFAULT 'general';
  END IF;
END $$;

-- Add source_type to differentiate brand vs local communications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'source_type') THEN
    ALTER TABLE public.communications ADD COLUMN source_type TEXT DEFAULT 'brand' CHECK (source_type IN ('brand', 'local'));
  END IF;
END $$;

-- Add source_branch_id for local communications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'source_branch_id') THEN
    ALTER TABLE public.communications ADD COLUMN source_branch_id UUID REFERENCES public.branches(id);
  END IF;
END $$;

-- Create index for faster queries by source
CREATE INDEX IF NOT EXISTS idx_communications_source ON public.communications(source_type, source_branch_id);

-- Update RLS policies for communications
DROP POLICY IF EXISTS "Users can view published communications" ON public.communications;
DROP POLICY IF EXISTS "Admins can manage communications" ON public.communications;
DROP POLICY IF EXISTS "Users can view relevant communications" ON public.communications;
DROP POLICY IF EXISTS "Brand admins can create brand communications" ON public.communications;
DROP POLICY IF EXISTS "Local managers can create local communications" ON public.communications;

-- Policy: Users can view communications that target them
CREATE POLICY "Users can view relevant communications" ON public.communications
FOR SELECT TO authenticated
USING (
  is_published = true
  AND (
    -- Brand communications: check role targeting
    (source_type = 'brand' AND (
      target_roles IS NULL 
      OR target_roles = '{}'
      OR EXISTS (
        SELECT 1 FROM user_roles_v2 ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND (
          ur.brand_role::text = ANY(target_roles)
          OR ur.local_role::text = ANY(target_roles)
        )
      )
    ))
    OR
    -- Local communications: check branch membership
    (source_type = 'local' AND EXISTS (
      SELECT 1 FROM user_roles_v2 ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND source_branch_id = ANY(ur.branch_ids)
    ))
  )
  AND (
    target_branch_ids IS NULL 
    OR target_branch_ids = '{}'
    OR EXISTS (
      SELECT 1 FROM user_roles_v2 ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (ur.branch_ids && target_branch_ids OR ur.brand_role = 'superadmin')
    )
  )
);

-- Policy: Brand admins can create/manage brand communications
CREATE POLICY "Brand admins can manage brand communications" ON public.communications
FOR ALL TO authenticated
USING (
  source_type = 'brand' AND EXISTS (
    SELECT 1 FROM user_roles_v2 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND brand_role IN ('superadmin', 'coordinador')
  )
)
WITH CHECK (
  source_type = 'brand' AND EXISTS (
    SELECT 1 FROM user_roles_v2 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND brand_role IN ('superadmin', 'coordinador')
  )
);

-- Policy: Local managers can create/manage local communications for their branch
CREATE POLICY "Local managers can manage local communications" ON public.communications
FOR ALL TO authenticated
USING (
  source_type = 'local' AND EXISTS (
    SELECT 1 FROM user_roles_v2 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND local_role IN ('encargado', 'franquiciado')
    AND source_branch_id = ANY(branch_ids)
  )
)
WITH CHECK (
  source_type = 'local' AND EXISTS (
    SELECT 1 FROM user_roles_v2 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND local_role IN ('encargado', 'franquiciado')
    AND source_branch_id = ANY(branch_ids)
  )
);