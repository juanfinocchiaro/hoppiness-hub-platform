-- Table to track which staff members were present during inspection
CREATE TABLE public.inspection_staff_present (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.branch_inspections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  was_present BOOLEAN DEFAULT false,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(inspection_id, user_id)
);

-- Enable RLS
ALTER TABLE public.inspection_staff_present ENABLE ROW LEVEL SECURITY;

-- Policies: Brand team (superadmin, coordinador) can manage
CREATE POLICY "Brand team can view inspection staff"
  ON public.inspection_staff_present
  FOR SELECT
  TO authenticated
  USING (
    is_superadmin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM user_roles_v2 
      WHERE user_id = auth.uid() 
      AND brand_role IN ('superadmin', 'coordinador')
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM branch_inspections bi
      JOIN user_branch_roles ubr ON ubr.branch_id = bi.branch_id
      WHERE bi.id = inspection_id
      AND ubr.user_id = auth.uid()
      AND ubr.local_role IN ('franquiciado', 'encargado')
      AND ubr.is_active = true
    )
  );

CREATE POLICY "Brand team can insert inspection staff"
  ON public.inspection_staff_present
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_superadmin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM user_roles_v2 
      WHERE user_id = auth.uid() 
      AND brand_role IN ('superadmin', 'coordinador')
      AND is_active = true
    )
  );

CREATE POLICY "Brand team can update inspection staff"
  ON public.inspection_staff_present
  FOR UPDATE
  TO authenticated
  USING (
    is_superadmin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM user_roles_v2 
      WHERE user_id = auth.uid() 
      AND brand_role IN ('superadmin', 'coordinador')
      AND is_active = true
    )
  );

CREATE POLICY "Brand team can delete inspection staff"
  ON public.inspection_staff_present
  FOR DELETE
  TO authenticated
  USING (
    is_superadmin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM user_roles_v2 
      WHERE user_id = auth.uid() 
      AND brand_role IN ('superadmin', 'coordinador')
      AND is_active = true
    )
  );

-- Index for faster lookups
CREATE INDEX idx_inspection_staff_inspection_id ON public.inspection_staff_present(inspection_id);