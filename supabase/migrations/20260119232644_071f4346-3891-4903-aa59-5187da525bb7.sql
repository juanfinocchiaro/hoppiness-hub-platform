-- HOTFIX S3: Remove overly permissive UPDATE policy on attendance_tokens
-- The edge function uses service role which bypasses RLS, so this permissive policy is unnecessary and dangerous

DROP POLICY IF EXISTS "Staff can update tokens" ON public.attendance_tokens;

-- Create a more restrictive policy: only managers can update tokens
CREATE POLICY "Managers can update attendance tokens"
ON public.attendance_tokens FOR UPDATE
USING (
  has_branch_permission(auth.uid(), branch_id, 'can_manage_staff')
)
WITH CHECK (
  has_branch_permission(auth.uid(), branch_id, 'can_manage_staff')
);

-- HOTFIX S2: Restrict employee-documents storage policies
-- Remove overly permissive policies that allow any authenticated user to access all documents

DROP POLICY IF EXISTS "Staff can view employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete employee documents" ON storage.objects;

-- New restrictive policies: only managers/admins can access employee documents
-- Using folder structure: employee-documents/{branch_id}/{employee_id}/{filename}

CREATE POLICY "Managers can view employee documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-documents' 
  AND (
    is_admin(auth.uid())
    OR (
      auth.role() = 'authenticated'
      AND has_branch_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'can_manage_staff')
    )
  )
);

CREATE POLICY "Managers can upload employee documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents' 
  AND (
    is_admin(auth.uid())
    OR (
      auth.role() = 'authenticated'
      AND has_branch_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'can_manage_staff')
    )
  )
);

CREATE POLICY "Managers can update employee documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'employee-documents' 
  AND (
    is_admin(auth.uid())
    OR (
      auth.role() = 'authenticated'
      AND has_branch_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'can_manage_staff')
    )
  )
);

CREATE POLICY "Managers can delete employee documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-documents' 
  AND (
    is_admin(auth.uid())
    OR (
      auth.role() = 'authenticated'
      AND has_branch_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'can_manage_staff')
    )
  )
);