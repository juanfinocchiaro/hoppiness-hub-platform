-- Create storage bucket for regulation documents
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('regulations', 'regulations', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for regulations bucket
CREATE POLICY "Superadmins can upload regulations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'regulations' 
  AND public.is_superadmin(auth.uid())
);

CREATE POLICY "Authenticated users can view regulations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'regulations');

-- Create storage bucket for signed regulation photos
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('regulation-signatures', 'regulation-signatures', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for regulation-signatures bucket
CREATE POLICY "Managers can upload signature photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'regulation-signatures' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles_v2 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND (brand_role = 'superadmin' OR local_role IN ('franquiciado', 'encargado'))
  )
);

CREATE POLICY "Staff can view their own signature photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'regulation-signatures'
  AND (
    -- Managers can see all
    EXISTS (
      SELECT 1 FROM public.user_roles_v2 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND (brand_role = 'superadmin' OR local_role IN ('franquiciado', 'encargado'))
    )
    OR
    -- User can see their own (path starts with their user_id)
    (storage.foldername(name))[1] = auth.uid()::text
  )
);