
-- Allow superadmins to insert reads on behalf of impersonated users
CREATE POLICY "Superadmin can insert reads for impersonation"
ON public.communication_reads
FOR INSERT
TO authenticated
WITH CHECK (
  is_superadmin(auth.uid()) OR user_id = auth.uid()
);

-- Drop the old restrictive insert policies
DROP POLICY IF EXISTS "Users can insert their own reads" ON public.communication_reads;
DROP POLICY IF EXISTS "communication_reads_insert" ON public.communication_reads;
