
-- Drop old storage policies for regulation-signatures bucket
DROP POLICY IF EXISTS "HR can upload regulation signatures" ON storage.objects;
DROP POLICY IF EXISTS "HR can view regulation signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view regulation signatures" ON storage.objects;

-- Recreate INSERT policy using user_branch_roles instead of user_roles_v2
CREATE POLICY "HR can upload regulation signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'regulation-signatures'
  AND (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_branch_roles
      WHERE user_id = auth.uid() AND is_active = true
      AND local_role IN ('franquiciado','encargado')
    )
  )
);

-- Recreate SELECT policy using user_branch_roles instead of user_roles_v2
CREATE POLICY "HR can view regulation signatures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'regulation-signatures'
  AND (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_branch_roles
      WHERE user_id = auth.uid() AND is_active = true
      AND local_role IN ('franquiciado','encargado')
    )
  )
);
