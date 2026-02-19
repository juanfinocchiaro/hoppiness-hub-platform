-- =========================================
-- FASE 6: Sistema de Apercibimientos
-- =========================================

-- 1. Add signed_document_url column to warnings table
ALTER TABLE public.warnings 
ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

-- 2. Create storage bucket for signed warning documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('warning-signatures', 'warning-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for warning-signatures bucket
-- Managers can upload signed documents for their branch
CREATE POLICY "Managers can upload warning signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'warning-signatures'
  AND EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR ur.local_role IN ('encargado', 'franquiciado')
    )
  )
);

-- Managers can view signatures from their branches
CREATE POLICY "Managers can view warning signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'warning-signatures'
  AND EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR ur.local_role IN ('encargado', 'franquiciado')
    )
  )
);

-- Users can view their own warning signatures
CREATE POLICY "Users can view own warning signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'warning-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Managers can delete signatures
CREATE POLICY "Managers can delete warning signatures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'warning-signatures'
  AND EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR ur.local_role IN ('encargado', 'franquiciado')
    )
  )
);

-- 4. Update RLS policies for warnings table to use user_id properly
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own warnings" ON public.warnings;
DROP POLICY IF EXISTS "Managers can manage warnings" ON public.warnings;
DROP POLICY IF EXISTS "Employees can view own warnings" ON public.warnings;
DROP POLICY IF EXISTS "Managers can insert warnings" ON public.warnings;
DROP POLICY IF EXISTS "Managers can update warnings" ON public.warnings;

-- Employees can view their own warnings
CREATE POLICY "Users can view own warnings"
ON public.warnings FOR SELECT
USING (user_id = auth.uid());

-- Managers can view all warnings in their branch
CREATE POLICY "Managers can view branch warnings"
ON public.warnings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR (
        ur.local_role IN ('encargado', 'franquiciado')
        AND warnings.branch_id = ANY(ur.branch_ids)
      )
    )
  )
);

-- Managers can create warnings for their branch
CREATE POLICY "Managers can insert warnings"
ON public.warnings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR (
        ur.local_role IN ('encargado', 'franquiciado')
        AND branch_id = ANY(ur.branch_ids)
      )
    )
  )
);

-- Managers can update warnings (add signed document, mark as inactive)
CREATE POLICY "Managers can update warnings"
ON public.warnings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles_v2 ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (
      ur.brand_role = 'superadmin'
      OR (
        ur.local_role IN ('encargado', 'franquiciado')
        AND warnings.branch_id = ANY(ur.branch_ids)
      )
    )
  )
);

-- Users can update their own warning (to acknowledge)
CREATE POLICY "Users can acknowledge own warnings"
ON public.warnings FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());