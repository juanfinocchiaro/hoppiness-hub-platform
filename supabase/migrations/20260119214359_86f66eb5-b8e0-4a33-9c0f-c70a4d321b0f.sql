-- Create storage bucket for scanned documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('scanned-documents', 'scanned-documents', false, 20971520) -- 20MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage policies for scanned documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'scanned-documents' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their uploaded documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'scanned-documents'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'scanned-documents'
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'coordinador'))
);